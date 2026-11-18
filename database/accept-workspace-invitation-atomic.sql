-- NEXO AI: aceptación atómica de invitaciones
-- Ejecutar en Supabase SQL Editor antes de sustituir los archivos TypeScript.
-- La función privada valida al usuario autenticado y realiza todas las escrituras
-- en una única transacción PostgreSQL.

create or replace function private.accept_workspace_invitation_internal(
  p_invitation_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.workspace_invitations%rowtype;
  v_inviter_role text;
begin
  if v_user_id is null then
    return 'unauthenticated';
  end if;

  -- Serializa las aceptaciones simultáneas del mismo usuario, incluso
  -- si proceden de invitaciones distintas a workspaces diferentes.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select lower(u.email), u.email_confirmed_at
    into v_user_email, v_email_confirmed_at
  from auth.users as u
  where u.id = v_user_id;

  if v_user_email is null or v_email_confirmed_at is null then
    return 'email_unconfirmed';
  end if;

  select wi.*
    into v_invitation
  from public.workspace_invitations as wi
  where wi.id = p_invitation_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if lower(btrim(v_invitation.email)) <> v_user_email then
    return 'email_mismatch';
  end if;

  if v_invitation.status = 'accepted'
     and v_invitation.accepted_user_id = v_user_id
     and exists (
       select 1
       from public.workspace_members as wm
       where wm.workspace_id = v_invitation.workspace_id
         and wm.user_id = v_user_id
     ) then
    return 'already_accepted';
  end if;

  if v_invitation.status <> 'pending' then
    return 'not_pending';
  end if;

  if v_invitation.expires_at <= pg_catalog.now() then
    update public.workspace_invitations
       set status = 'expired'
     where id = v_invitation.id
       and status = 'pending';
    return 'expired';
  end if;

  -- El invitador debe conservar sus permisos al aceptar la invitación.
  select wm.role
    into v_inviter_role
  from public.workspace_members as wm
  where wm.workspace_id = v_invitation.workspace_id
    and wm.user_id = v_invitation.invited_by
  for share;

  if v_inviter_role is null
     or v_inviter_role not in ('owner', 'admin') then
    return 'inviter_unauthorized';
  end if;

  if v_invitation.role = 'admin' and v_inviter_role <> 'owner' then
    return 'inviter_unauthorized';
  end if;

  -- NEXO AI todavía admite un único workspace por usuario.
  if exists (
    select 1
    from public.workspace_members as wm
    where wm.user_id = v_user_id
      and wm.workspace_id <> v_invitation.workspace_id
  ) then
    return 'already_in_other_workspace';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invitation.workspace_id, v_user_id, v_invitation.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
     set status = 'accepted',
         accepted_at = pg_catalog.now(),
         accepted_user_id = v_user_id
   where id = v_invitation.id
     and status = 'pending';

  if not found then
    -- El error provoca rollback de la inserción de membership.
    raise exception 'No se pudo consumir la invitación pendiente.';
  end if;

  return 'accepted';
end;
$function$;

-- La función interna no se publica como endpoint PostgREST.
revoke all on function private.accept_workspace_invitation_internal(uuid) from public;
revoke all on function private.accept_workspace_invitation_internal(uuid) from anon;
grant execute on function private.accept_workspace_invitation_internal(uuid) to authenticated;

-- Wrapper invoker: endpoint público de RPC, sin privilegios elevados propios.
create or replace function public.accept_workspace_invitation(
  p_invitation_id uuid
)
returns text
language sql
security invoker
set search_path = ''
as $function$
  select private.accept_workspace_invitation_internal(p_invitation_id);
$function$;

revoke all on function public.accept_workspace_invitation(uuid) from public;
revoke all on function public.accept_workspace_invitation(uuid) from anon;
grant execute on function public.accept_workspace_invitation(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Verificación final de la configuración y permisos.
select
  n.nspname as schema_name,
  p.oid::regprocedure as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where (n.nspname = 'private' and p.proname = 'accept_workspace_invitation_internal')
   or (n.nspname = 'public' and p.proname = 'accept_workspace_invitation')
order by n.nspname;

select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_name in ('accept_workspace_invitation_internal', 'accept_workspace_invitation')
order by routine_schema, routine_name, grantee;
