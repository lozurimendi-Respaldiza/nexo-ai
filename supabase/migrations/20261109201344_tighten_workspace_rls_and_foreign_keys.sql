alter table public.opportunities
  drop constraint opportunities_contact_workspace_fk,
  add constraint opportunities_contact_workspace_fk
    foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id);

alter table public.activities
  drop constraint activities_contact_id_workspace_id_fkey,
  add constraint activities_contact_id_workspace_id_fkey
    foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id),
  drop constraint activities_opportunity_id_workspace_id_fkey,
  add constraint activities_opportunity_id_workspace_id_fkey
    foreign key (opportunity_id, workspace_id)
    references public.opportunities(id, workspace_id);

alter table public.tasks
  drop constraint tasks_contact_id_workspace_id_fkey,
  add constraint tasks_contact_id_workspace_id_fkey
    foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id),
  drop constraint tasks_opportunity_id_workspace_id_fkey,
  add constraint tasks_opportunity_id_workspace_id_fkey
    foreign key (opportunity_id, workspace_id)
    references public.opportunities(id, workspace_id);

drop policy "workspace members manage contacts" on public.contacts;
create policy "members can read contacts" on public.contacts
  for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "members can create contacts" on public.contacts
  for insert to authenticated with check (
    (select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid())
  );
create policy "members can update contacts" on public.contacts
  for update to authenticated using ((select private.is_workspace_member(workspace_id)))
  with check ((select private.is_workspace_member(workspace_id)));
create policy "members can delete contacts" on public.contacts
  for delete to authenticated using ((select private.is_workspace_member(workspace_id)));

drop policy "workspace members manage opportunities" on public.opportunities;
create policy "members can read opportunities" on public.opportunities
  for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "members can create opportunities" on public.opportunities
  for insert to authenticated with check (
    (select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid())
  );
create policy "members can update opportunities" on public.opportunities
  for update to authenticated using ((select private.is_workspace_member(workspace_id)))
  with check ((select private.is_workspace_member(workspace_id)));
create policy "members can delete opportunities" on public.opportunities
  for delete to authenticated using ((select private.is_workspace_member(workspace_id)));

drop policy "workspace members manage activities" on public.activities;
create policy "members can read activities" on public.activities
  for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "members can create activities" on public.activities
  for insert to authenticated with check (
    (select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid())
  );
create policy "members can update activities" on public.activities
  for update to authenticated using ((select private.is_workspace_member(workspace_id)))
  with check ((select private.is_workspace_member(workspace_id)));
create policy "members can delete activities" on public.activities
  for delete to authenticated using ((select private.is_workspace_member(workspace_id)));

drop policy "workspace members manage tasks" on public.tasks;
create policy "members can read tasks" on public.tasks
  for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "members can create tasks" on public.tasks
  for insert to authenticated with check (
    (select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid())
  );
create policy "members can update tasks" on public.tasks
  for update to authenticated using ((select private.is_workspace_member(workspace_id)))
  with check ((select private.is_workspace_member(workspace_id)));
create policy "members can delete tasks" on public.tasks
  for delete to authenticated using ((select private.is_workspace_member(workspace_id)));
