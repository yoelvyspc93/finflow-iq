create table if not exists public.goals (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  target_amount numeric(18,2) not null check (target_amount > 0),
  deadline date,
  icon text,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.goal_contributions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  date date not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wishes (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  estimated_amount numeric(18,2) not null check (estimated_amount > 0),
  priority integer not null check (priority > 0),
  notes text,
  estimated_purchase_date date,
  confidence_level text
    check (confidence_level in ('high', 'medium', 'low', 'risky')),
  confidence_reason text,
  last_calculated_at timestamptz,
  ai_advice text,
  last_ai_advice_at timestamptz,
  is_purchased boolean not null default false,
  purchased_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.financial_scores (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  week_start date not null
    check (week_start = date_trunc('week', week_start)::date),
  breakdown jsonb not null,
  ai_tip text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, week_start)
);

create index if not exists goals_user_id_wallet_id_idx
  on public.goals (user_id, wallet_id);
create index if not exists goals_user_id_status_idx
  on public.goals (user_id, status, created_at desc);

create index if not exists goal_contributions_user_id_goal_id_idx
  on public.goal_contributions (user_id, goal_id);
create index if not exists goal_contributions_user_id_date_idx
  on public.goal_contributions (user_id, date desc, created_at desc);

create unique index if not exists wishes_user_id_priority_key
  on public.wishes (user_id, priority);
create index if not exists wishes_user_id_wallet_id_idx
  on public.wishes (user_id, wallet_id);
create index if not exists wishes_user_id_purchase_idx
  on public.wishes (user_id, is_purchased, priority asc);

create index if not exists financial_scores_user_id_week_start_idx
  on public.financial_scores (user_id, week_start desc);

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

drop trigger if exists wishes_set_updated_at on public.wishes;
create trigger wishes_set_updated_at
before update on public.wishes
for each row
execute function public.set_updated_at();

alter table public.ledger_entries
  add column if not exists goal_contribution_id uuid references public.goal_contributions(id) on delete set null;

create index if not exists ledger_entries_goal_contribution_id_idx
  on public.ledger_entries (goal_contribution_id);

create or replace function public.validate_planning_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_goal public.goals;
begin
  if not exists (
    select 1
    from public.wallets
    where id = new.wallet_id
      and user_id = new.user_id
  ) then
    raise exception 'Wallet does not belong to the authenticated user.';
  end if;

  if tg_table_name = 'goal_contributions' then
    select *
    into selected_goal
    from public.goals
    where id = new.goal_id
      and user_id = new.user_id;

    if not found then
      raise exception 'Goal does not belong to the authenticated user.';
    end if;

    if selected_goal.wallet_id <> new.wallet_id then
      raise exception 'Goal contributions must use the same wallet as the goal.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists goals_validate_integrity on public.goals;
create trigger goals_validate_integrity
before insert or update on public.goals
for each row
execute function public.validate_planning_integrity();

drop trigger if exists wishes_validate_integrity on public.wishes;
create trigger wishes_validate_integrity
before insert or update on public.wishes
for each row
execute function public.validate_planning_integrity();

drop trigger if exists goal_contributions_validate_integrity on public.goal_contributions;
create trigger goal_contributions_validate_integrity
before insert or update on public.goal_contributions
for each row
execute function public.validate_planning_integrity();

create or replace function public.validate_ledger_entry_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.wallets
    where id = new.wallet_id
      and user_id = new.user_id
  ) then
    raise exception 'Wallet does not belong to the authenticated user.';
  end if;

  if new.category_id is not null and not exists (
    select 1
    from public.categories
    where id = new.category_id
      and user_id = new.user_id
  ) then
    raise exception 'Category does not belong to the authenticated user.';
  end if;

  if new.income_source_id is not null and not exists (
    select 1
    from public.income_sources
    where id = new.income_source_id
      and user_id = new.user_id
  ) then
    raise exception 'Income source does not belong to the authenticated user.';
  end if;

  if new.recurring_expense_id is not null and new.budget_provision_id is not null then
    raise exception 'A ledger entry can only reference one commitment source.';
  end if;

  if new.recurring_expense_id is not null and not exists (
    select 1
    from public.recurring_expenses
    where id = new.recurring_expense_id
      and user_id = new.user_id
      and wallet_id = new.wallet_id
  ) then
    raise exception 'Recurring expense does not belong to the authenticated user.';
  end if;

  if new.budget_provision_id is not null and not exists (
    select 1
    from public.budget_provisions
    where id = new.budget_provision_id
      and user_id = new.user_id
      and wallet_id = new.wallet_id
  ) then
    raise exception 'Budget provision does not belong to the authenticated user.';
  end if;

  if new.goal_contribution_id is not null and not exists (
    select 1
    from public.goal_contributions
    where id = new.goal_contribution_id
      and user_id = new.user_id
      and wallet_id = new.wallet_id
  ) then
    raise exception 'Goal contribution does not belong to the authenticated user.';
  end if;

  if new.type = 'recurring_expense_payment' and new.recurring_expense_id is null then
    raise exception 'Recurring expense payments must reference a recurring_expense_id.';
  end if;

  if new.type = 'budget_provision_payment' and new.budget_provision_id is null then
    raise exception 'Budget provision payments must reference a budget_provision_id.';
  end if;

  if new.type = 'goal_deposit' and new.goal_contribution_id is null then
    raise exception 'Goal deposits must reference a goal_contribution_id.';
  end if;

  if new.recurring_expense_id is not null and new.type <> 'recurring_expense_payment' then
    raise exception 'recurring_expense_id can only be used with recurring_expense_payment entries.';
  end if;

  if new.budget_provision_id is not null and new.type <> 'budget_provision_payment' then
    raise exception 'budget_provision_id can only be used with budget_provision_payment entries.';
  end if;

  if new.goal_contribution_id is not null and new.type <> 'goal_deposit' then
    raise exception 'goal_contribution_id can only be used with goal_deposit entries.';
  end if;

  if new.type in ('income', 'salary_payment', 'exchange_in', 'goal_withdrawal')
     and new.amount <= 0 then
    raise exception 'Entry type % requires a positive amount.', new.type;
  end if;

  if new.type in (
      'expense',
      'exchange_out',
      'goal_deposit',
      'recurring_expense_payment',
      'budget_provision_payment'
    )
     and new.amount >= 0 then
    raise exception 'Entry type % requires a negative amount.', new.type;
  end if;

  return new;
end;
$$;

alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.wishes enable row level security;
alter table public.financial_scores enable row level security;

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own"
on public.goals
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own"
on public.goals
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own"
on public.goals
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own"
on public.goals
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "goal_contributions_select_own" on public.goal_contributions;
create policy "goal_contributions_select_own"
on public.goal_contributions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "wishes_select_own" on public.wishes;
create policy "wishes_select_own"
on public.wishes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "wishes_insert_own" on public.wishes;
create policy "wishes_insert_own"
on public.wishes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "wishes_update_own" on public.wishes;
create policy "wishes_update_own"
on public.wishes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "wishes_delete_own" on public.wishes;
create policy "wishes_delete_own"
on public.wishes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "financial_scores_select_own" on public.financial_scores;
create policy "financial_scores_select_own"
on public.financial_scores
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "financial_scores_insert_own" on public.financial_scores;
create policy "financial_scores_insert_own"
on public.financial_scores
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "financial_scores_update_own" on public.financial_scores;
create policy "financial_scores_update_own"
on public.financial_scores
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.add_goal_contribution(
  target_goal_id uuid,
  target_wallet_id uuid,
  contribution_amount numeric(18,2),
  target_date date,
  contribution_note text default null
)
returns public.goal_contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  selected_goal public.goals;
  inserted_contribution public.goal_contributions;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if contribution_amount is null or contribution_amount <= 0 then
    raise exception 'Goal contribution amount must be greater than zero.';
  end if;

  select *
  into selected_goal
  from public.goals
  where id = target_goal_id
    and user_id = current_user_id
    and status = 'active';

  if not found then
    raise exception 'Goal does not belong to the authenticated user.';
  end if;

  if selected_goal.wallet_id <> target_wallet_id then
    raise exception 'Goal contributions must use the same wallet configured on the goal.';
  end if;

  insert into public.goal_contributions (
    user_id,
    goal_id,
    wallet_id,
    amount,
    date,
    note
  )
  values (
    current_user_id,
    target_goal_id,
    target_wallet_id,
    contribution_amount,
    target_date,
    nullif(trim(contribution_note), '')
  )
  returning * into inserted_contribution;

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    amount,
    type,
    description,
    goal_contribution_id,
    date
  )
  values (
    current_user_id,
    target_wallet_id,
    contribution_amount * -1,
    'goal_deposit',
    coalesce(nullif(trim(contribution_note), ''), selected_goal.name),
    inserted_contribution.id,
    target_date
  );

  update public.goals
  set status = case
      when (
        select coalesce(sum(amount), 0)
        from public.goal_contributions
        where goal_id = selected_goal.id
      ) >= selected_goal.target_amount
        then 'completed'
      else 'active'
    end,
    updated_at = timezone('utc', now())
  where id = selected_goal.id;

  return inserted_contribution;
end;
$$;

grant execute on function public.add_goal_contribution(
  uuid,
  uuid,
  numeric,
  date,
  text
)
to authenticated;
