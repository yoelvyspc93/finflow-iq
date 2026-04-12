alter table public.ai_insights
  drop constraint if exists ai_insights_scope_check;

alter table public.ai_insights
  add constraint ai_insights_scope_check
  check (scope in ('weekly_summary', 'wish_advice', 'dashboard_health', 'simulation'));
