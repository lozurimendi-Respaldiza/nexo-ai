create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  contact_id uuid,
  opportunity_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_events_valid_time
    check (ends_at > starts_at),

  constraint calendar_events_contact_workspace_fk
    foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id),

  constraint calendar_events_opportunity_workspace_fk
    foreign key (opportunity_id, workspace_id)
    references public.opportunities(id, workspace_id)
);

create index calendar_events_workspace_starts_idx
  on public.calendar_events(workspace_id, starts_at);

create index calendar_events_workspace_contact_idx
  on public.calendar_events(workspace_id, contact_id)
  where contact_id is not null;

create index calendar_events_workspace_opportunity_idx
  on public.calendar_events(workspace_id, opportunity_id)
  where opportunity_id is not null;

alter table public.calendar_events enable row level security;

grant select, insert, update, delete
  on public.calendar_events to authenticated;

create policy "members can read calendar events"
  on public.calendar_events
  for select to authenticated
  using (
    (select private.is_workspace_member(workspace_id))
    and (
      created_by = (select auth.uid())
      or contact_id is not null
      or opportunity_id is not null
    )
  );
create policy "members can create calendar events"
  on public.calendar_events
  for insert to authenticated
  with check (
    (select private.is_workspace_member(workspace_id))
    and created_by = (select auth.uid())
  );

create policy "members can update calendar events"
  on public.calendar_events
  for update to authenticated
  using (
    (select private.is_workspace_member(workspace_id))
    and created_by = (select auth.uid())
  )
  with check (
    (select private.is_workspace_member(workspace_id))
    and created_by = (select auth.uid())
  );
create policy "members can delete calendar events"
  on public.calendar_events
  for delete to authenticated
  using (
    (select private.is_workspace_member(workspace_id))
    and created_by = (select auth.uid())
  );
-- Conserva las citas y elimina únicamente el vínculo con el registro borrado.
create or replace function public.detach_calendar_events_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_table_name = 'contacts' then
    update public.calendar_events
      set contact_id = null,
          updated_at = pg_catalog.now()
    where workspace_id = old.workspace_id
      and contact_id = old.id;

  elsif tg_table_name = 'opportunities' then
    update public.calendar_events
      set opportunity_id = null,
          updated_at = pg_catalog.now()
    where workspace_id = old.workspace_id
      and opportunity_id = old.id;
  end if;

  return old;
end;
$function$;

revoke all on function public.detach_calendar_events_before_delete()
  from public, anon, authenticated;

create trigger detach_calendar_events_before_contact_delete
  before delete on public.contacts
  for each row
  execute function public.detach_calendar_events_before_delete();

create trigger detach_calendar_events_before_opportunity_delete
  before delete on public.opportunities
  for each row
  execute function public.detach_calendar_events_before_delete();

-- Incluye las citas en el reinicio del espacio de trabajo.
create or replace function public.reset_workspace_data(p_workspace_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = v_user_id
      and wm.role = 'owner'
  ) then
    raise exception 'Only the workspace owner can reset workspace data';
  end if;

  delete from public.nba_recommendation_events
  where workspace_id = p_workspace_id;

  delete from public.calendar_events
  where workspace_id = p_workspace_id;

  delete from public.activities
  where workspace_id = p_workspace_id;

  delete from public.tasks
  where workspace_id = p_workspace_id;

  delete from public.opportunities
  where workspace_id = p_workspace_id;

  delete from public.contacts
  where workspace_id = p_workspace_id;

  delete from public.workspace_invitations
  where workspace_id = p_workspace_id;

  return 'ok';
end;
$function$;

revoke all on function public.reset_workspace_data(uuid) from public;
revoke all on function public.reset_workspace_data(uuid) from anon;
grant execute on function public.reset_workspace_data(uuid) to authenticated;
