create table if not exists public.ai_insights (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null
    check (scope in ('weekly_summary', 'wish_advice', 'dashboard_health')),
  scope_id uuid,
  snapshot_fingerprint text not null,
  input_snapshot jsonb not null,
  output_text text,
  output_json jsonb,
  model text,
  status text not null default 'completed'
    check (status in ('completed', 'fallback', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz
);

create index if not exists ai_insights_user_scope_lookup_idx
  on public.ai_insights (
    user_id,
    scope,
    scope_id,
    snapshot_fingerprint,
    created_at desc
  );

create index if not exists ai_insights_user_expires_at_idx
  on public.ai_insights (user_id, expires_at desc);

alter table public.ai_insights enable row level security;

drop policy if exists "ai_insights_select_own" on public.ai_insights;
create policy "ai_insights_select_own"
on public.ai_insights
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "ai_insights_insert_own" on public.ai_insights;
create policy "ai_insights_insert_own"
on public.ai_insights
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "ai_insights_update_own" on public.ai_insights;
create policy "ai_insights_update_own"
on public.ai_insights
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
