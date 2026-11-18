create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_id_idx on public.workspace_members(user_id);

create or replace function private.is_workspace_member(_workspace_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_workspace_role(_workspace_id uuid, _roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = any(_roles)
  );
$$;

create or replace function private.is_workspace_creator(_workspace_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = _workspace_id
      and w.created_by = (select auth.uid())
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.has_workspace_role(uuid, text[]) from public, anon;
revoke all on function private.is_workspace_creator(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function private.is_workspace_creator(uuid) to authenticated;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  company text,
  source text,
  status text not null default 'new' check (status in ('new','contacted','qualified','inactive')),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index contacts_workspace_created_idx on public.contacts(workspace_id, created_at desc);
create index contacts_workspace_email_idx on public.contacts(workspace_id, email);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid,
  title text not null,
  value numeric(12,2) not null default 0 check (value >= 0),
  currency char(3) not null default 'EUR',
  stage text not null default 'new' check (stage in ('new','contacted','qualified','proposal','negotiation','won','lost')),
  probability smallint not null default 10 check (probability between 0 and 100),
  expected_close_date date,
  next_action_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint opportunities_contact_workspace_fk
    foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id) on delete set null
);
create index opportunities_workspace_stage_idx on public.opportunities(workspace_id, stage);
create index opportunities_workspace_next_action_idx on public.opportunities(workspace_id, next_action_at);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid,
  opportunity_id uuid,
  type text not null check (type in ('call','email','meeting','note','status_change','other')),
  subject text not null,
  body text,
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id) on delete set null,
  foreign key (opportunity_id, workspace_id)
    references public.opportunities(id, workspace_id) on delete set null
);
create index activities_workspace_occurred_idx on public.activities(workspace_id, occurred_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  contact_id uuid,
  opportunity_id uuid,
  created_by uuid not null references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id) on delete set null,
  foreign key (opportunity_id, workspace_id)
    references public.opportunities(id, workspace_id) on delete set null
);
create index tasks_workspace_due_idx on public.tasks(workspace_id, due_at);
create index tasks_workspace_status_idx on public.tasks(workspace_id, status);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function private.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts
for each row execute function private.set_updated_at();
create trigger opportunities_set_updated_at before update on public.opportunities
for each row execute function private.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function private.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.contacts enable row level security;
alter table public.opportunities enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;

create policy "workspace members can read their workspaces"
on public.workspaces for select to authenticated
using ((select private.is_workspace_member(id)));

create policy "authenticated users can create their own workspace"
on public.workspaces for insert to authenticated
with check ((select auth.uid()) = created_by);

create policy "workspace admins can update workspaces"
on public.workspaces for update to authenticated
using ((select private.has_workspace_role(id, array['owner','admin'])))
with check ((select private.has_workspace_role(id, array['owner','admin'])));

create policy "members can read workspace memberships"
on public.workspace_members for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "workspace creator can add initial membership"
on public.workspace_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and (select private.is_workspace_creator(workspace_id))
);

grant select, insert, update, delete on
  public.workspaces, public.workspace_members, public.contacts,
  public.opportunities, public.activities, public.tasks
to authenticated;

create policy "workspace members manage contacts"
on public.contacts for all to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check (
  (select private.is_workspace_member(workspace_id))
  and created_by = (select auth.uid())
);

create policy "workspace members manage opportunities"
on public.opportunities for all to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check (
  (select private.is_workspace_member(workspace_id))
  and created_by = (select auth.uid())
);

create policy "workspace members manage activities"
on public.activities for all to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check (
  (select private.is_workspace_member(workspace_id))
  and created_by = (select auth.uid())
);

create policy "workspace members manage tasks"
on public.tasks for all to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check (
  (select private.is_workspace_member(workspace_id))
  and created_by = (select auth.uid())
);
