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
