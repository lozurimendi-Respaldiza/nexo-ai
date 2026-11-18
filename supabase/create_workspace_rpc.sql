-- NEXO AI: creación atómica e idempotente del workspace inicial.
create or replace function public.create_workspace_for_current_user(workspace_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if workspace_name is null
     or char_length(btrim(workspace_name)) < 2
     or char_length(btrim(workspace_name)) > 120 then
    raise exception 'Workspace name must contain between 2 and 120 characters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select wm.workspace_id
    into v_workspace_id
    from public.workspace_members wm
   where wm.user_id = v_user_id
   order by wm.created_at asc
   limit 1;

  if v_workspace_id is not null then
    return v_workspace_id;
  end if;

  insert into public.workspaces (name, created_by)
  values (btrim(workspace_name), v_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  return v_workspace_id;
end;
$function$;

revoke all on function public.create_workspace_for_current_user(text) from public, anon;
grant execute on function public.create_workspace_for_current_user(text) to authenticated;
