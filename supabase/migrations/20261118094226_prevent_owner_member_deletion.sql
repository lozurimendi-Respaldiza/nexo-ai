-- Evita que un propietario elimine a otro propietario.
-- Los propietarios solo pueden eliminar miembros con rol admin o member.

drop policy if exists "workspace owners can remove other members"
on public.workspace_members;

create policy "workspace owners can remove non-owner members"
on public.workspace_members
for delete
to authenticated
using (
  user_id <> (select auth.uid())
  and role in ('admin', 'member')
  and (
    select private.has_workspace_role(
      workspace_members.workspace_id,
      array['owner']::text[]
    )
  )
);