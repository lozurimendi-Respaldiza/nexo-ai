alter table public.tasks
  add constraint tasks_id_workspace_id_key unique (id, workspace_id);

create table public.nba_recommendation_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid null,
  task_id uuid null,
  recommendation_key text not null,
  recommendation_date date not null default (now() at time zone 'utc')::date,
  kind text not null check (kind in ('opportunity', 'task')),
  title_snapshot text not null,
  score integer not null check (score between 0 and 100),
  factors jsonb not null default '[]'::jsonb check (jsonb_typeof(factors) = 'array'),
  action_snapshot text not null,
  message_snapshot text null,
  status text not null default 'recommended' check (status in ('recommended', 'executed', 'dismissed')),
  recommended_by uuid not null references auth.users(id),
  acted_by uuid null references auth.users(id),
  acted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nba_recommendation_events_opportunity_workspace_fk
    foreign key (opportunity_id, workspace_id) references public.opportunities(id, workspace_id),
  constraint nba_recommendation_events_task_workspace_fk
    foreign key (task_id, workspace_id) references public.tasks(id, workspace_id),
  constraint nba_recommendation_events_target_check
    check ((kind = 'opportunity' and opportunity_id is not null and task_id is null)
      or (kind = 'task' and task_id is not null and opportunity_id is null)),
  constraint nba_recommendation_events_daily_key
    unique (workspace_id, recommendation_key, recommendation_date)
);

create index nba_recommendation_events_workspace_created_idx
  on public.nba_recommendation_events (workspace_id, created_at desc);
create index nba_recommendation_events_workspace_status_idx
  on public.nba_recommendation_events (workspace_id, status);
create index nba_recommendation_events_opportunity_idx
  on public.nba_recommendation_events (opportunity_id, workspace_id)
  where opportunity_id is not null;

alter table public.nba_recommendation_events enable row level security;

create policy "members can read NBA recommendation events"
on public.nba_recommendation_events for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create NBA recommendation events"
on public.nba_recommendation_events for insert to authenticated
with check ((select private.is_workspace_member(workspace_id))
  and recommended_by = (select auth.uid()));

create policy "members can update NBA recommendation events"
on public.nba_recommendation_events for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

grant select, insert, update on public.nba_recommendation_events to authenticated;
