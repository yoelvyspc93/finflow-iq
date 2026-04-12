alter table public.ai_insights
  add column if not exists provider text,
  add column if not exists prompt_version text,
  add column if not exists latency_ms integer,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists source text,
  add column if not exists job_id uuid;

create table if not exists public.ai_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null
    check (scope in ('weekly_summary', 'wish_advice', 'dashboard_health')),
  scope_id uuid,
  trigger_source text not null,
  snapshot_fingerprint text not null,
  input_snapshot jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'dead_letter')),
  attempts integer not null default 0
    check (attempts >= 0),
  max_attempts integer not null default 3
    check (max_attempts >= 1),
  priority integer not null default 100,
  available_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  provider text,
  model text,
  prompt_version text,
  last_error text,
  ai_insight_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.ai_insights
  add constraint ai_insights_job_id_fkey
  foreign key (job_id)
  references public.ai_jobs(id)
  on delete set null;

alter table public.ai_jobs
  add constraint ai_jobs_ai_insight_id_fkey
  foreign key (ai_insight_id)
  references public.ai_insights(id)
  on delete set null;

create index if not exists ai_jobs_user_scope_status_idx
  on public.ai_jobs (user_id, scope, scope_id, status, available_at asc);

create index if not exists ai_jobs_snapshot_fingerprint_idx
  on public.ai_jobs (snapshot_fingerprint, created_at desc);

create unique index if not exists ai_jobs_pending_dedupe_idx
  on public.ai_jobs (
    user_id,
    scope,
    coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid),
    snapshot_fingerprint
  )
  where status in ('pending', 'running');

create index if not exists ai_insights_job_id_idx
  on public.ai_insights (job_id);

alter table public.ai_jobs enable row level security;

drop policy if exists "ai_jobs_select_own" on public.ai_jobs;
create policy "ai_jobs_select_own"
on public.ai_jobs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "ai_insights_insert_own" on public.ai_insights;
drop policy if exists "ai_insights_update_own" on public.ai_insights;

drop trigger if exists ai_jobs_set_updated_at on public.ai_jobs;
create trigger ai_jobs_set_updated_at
before update on public.ai_jobs
for each row
execute function public.set_updated_at();

create or replace function public.claim_ai_jobs(target_batch_size integer default 5)
returns setof public.ai_jobs
language sql
security definer
set search_path = public
as $$
  with next_jobs as (
    select id
    from public.ai_jobs
    where status in ('pending', 'failed')
      and available_at <= timezone('utc', now())
    order by priority desc, available_at asc, created_at asc
    limit greatest(target_batch_size, 1)
    for update skip locked
  )
  update public.ai_jobs as jobs
  set
    status = 'running',
    started_at = timezone('utc', now()),
    attempts = jobs.attempts + 1,
    updated_at = timezone('utc', now())
  from next_jobs
  where jobs.id = next_jobs.id
  returning jobs.*;
$$;

revoke all on function public.claim_ai_jobs(integer) from public;
grant execute on function public.claim_ai_jobs(integer) to service_role;
