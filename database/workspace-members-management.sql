-- NEXO AI: invitaciones y gestión de miembros.
-- Ejecutar en Supabase SQL Editor una sola vez.

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (char_length(trim(email)) between 3 and 254),
  role text not null check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists workspace_invitations_workspace_status_idx
  on public.workspace_invitations (workspace_id, status, created_at desc);

create unique index if not exists workspace_invitations_one_pending_email_idx
  on public.workspace_invitations (workspace_id, lower(email))
  where status = 'pending';

alter table public.workspace_invitations enable row level security;
revoke all on table public.workspace_invitations from anon, authenticated;
grant all on table public.workspace_invitations to service_role;

-- Solo el propietario puede cambiar el rol de otros miembros.
-- El rol owner y la propia membresía del propietario quedan protegidos.
drop policy if exists "workspace owners can update member roles" on public.workspace_members;
create policy "workspace owners can update member roles"
  on public.workspace_members
  for update
  to authenticated
  using (
    user_id <> (select auth.uid())
    and role in ('admin', 'member')
    and (select private.has_workspace_role(workspace_id, array['owner']::text[]))
  )
  with check (
    user_id <> (select auth.uid())
    and role in ('admin', 'member')
    and (select private.has_workspace_role(workspace_id, array['owner']::text[]))
  );

-- Limita las columnas que un usuario autenticado puede actualizar.
revoke update on table public.workspace_members from authenticated;
grant update (role) on table public.workspace_members to authenticated;
