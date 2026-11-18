create index nba_recommendation_events_recommended_by_idx
  on public.nba_recommendation_events (recommended_by);
create index nba_recommendation_events_acted_by_idx
  on public.nba_recommendation_events (acted_by)
  where acted_by is not null;
create index nba_recommendation_events_task_workspace_idx
  on public.nba_recommendation_events (task_id, workspace_id)
  where task_id is not null;
