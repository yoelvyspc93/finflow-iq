create table if not exists public.recurring_expenses (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  amount numeric(18,2) not null check (amount > 0),
  type text not null
    check (type in ('subscription', 'fixed_expense')),
  frequency text not null
    check (frequency in ('monthly', 'yearly')),
  billing_day integer not null
    check (billing_day between 1 and 31),
  billing_month integer
    check (billing_month between 1 and 12),
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (frequency = 'monthly' and billing_month is null)
    or (frequency = 'yearly' and billing_month is not null)
  )
);

create table if not exists public.budget_provisions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  amount numeric(18,2) not null check (amount > 0),
  month date not null
    check (month = date_trunc('month', month)::date),
  recurrence text not null
    check (recurrence in ('once', 'yearly')),
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists recurring_expenses_user_id_wallet_id_idx
  on public.recurring_expenses (user_id, wallet_id);
create index if not exists recurring_expenses_user_id_frequency_idx
  on public.recurring_expenses (user_id, frequency, billing_month, billing_day);
create index if not exists recurring_expenses_category_id_idx
  on public.recurring_expenses (category_id);

create index if not exists budget_provisions_user_id_wallet_id_idx
  on public.budget_provisions (user_id, wallet_id);
create index if not exists budget_provisions_user_id_month_idx
  on public.budget_provisions (user_id, month desc, created_at desc);
create index if not exists budget_provisions_category_id_idx
  on public.budget_provisions (category_id);

drop trigger if exists recurring_expenses_set_updated_at on public.recurring_expenses;
create trigger recurring_expenses_set_updated_at
before update on public.recurring_expenses
for each row
execute function public.set_updated_at();

drop trigger if exists budget_provisions_set_updated_at on public.budget_provisions;
create trigger budget_provisions_set_updated_at
before update on public.budget_provisions
for each row
execute function public.set_updated_at();

alter table public.ledger_entries
  add column if not exists recurring_expense_id uuid references public.recurring_expenses(id) on delete set null,
  add column if not exists budget_provision_id uuid references public.budget_provisions(id) on delete set null;

create index if not exists ledger_entries_recurring_expense_id_idx
  on public.ledger_entries (recurring_expense_id);
create index if not exists ledger_entries_budget_provision_id_idx
  on public.ledger_entries (budget_provision_id);

alter table public.ledger_entries
  drop constraint if exists ledger_entries_type_check;

alter table public.ledger_entries
  add constraint ledger_entries_type_check
  check (
    type in (
      'income',
      'salary_payment',
      'expense',
      'exchange_out',
      'exchange_in',
      'goal_deposit',
      'goal_withdrawal',
      'adjustment',
      'recurring_expense_payment',
      'budget_provision_payment'
    )
  );

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

  if new.type = 'recurring_expense_payment' and new.recurring_expense_id is null then
    raise exception 'Recurring expense payments must reference a recurring_expense_id.';
  end if;

  if new.type = 'budget_provision_payment' and new.budget_provision_id is null then
    raise exception 'Budget provision payments must reference a budget_provision_id.';
  end if;

  if new.recurring_expense_id is not null and new.type <> 'recurring_expense_payment' then
    raise exception 'recurring_expense_id can only be used with recurring_expense_payment entries.';
  end if;

  if new.budget_provision_id is not null and new.type <> 'budget_provision_payment' then
    raise exception 'budget_provision_id can only be used with budget_provision_payment entries.';
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

alter table public.recurring_expenses enable row level security;
alter table public.budget_provisions enable row level security;

drop policy if exists "recurring_expenses_select_own" on public.recurring_expenses;
create policy "recurring_expenses_select_own"
on public.recurring_expenses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "budget_provisions_select_own" on public.budget_provisions;
create policy "budget_provisions_select_own"
on public.budget_provisions
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.create_recurring_expense(
  target_wallet_id uuid,
  expense_name text,
  committed_amount numeric(18,2),
  expense_type text,
  expense_frequency text,
  target_billing_day integer,
  target_billing_month integer default null,
  target_category_id uuid default null,
  target_notes text default null
)
returns public.recurring_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  selected_wallet public.wallets;
  new_expense public.recurring_expenses;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if committed_amount is null or committed_amount <= 0 then
    raise exception 'Recurring expense amount must be greater than zero.';
  end if;

  if expense_type not in ('subscription', 'fixed_expense') then
    raise exception 'Unsupported recurring expense type.';
  end if;

  if expense_frequency not in ('monthly', 'yearly') then
    raise exception 'Unsupported recurring expense frequency.';
  end if;

  if target_billing_day is null or target_billing_day < 1 or target_billing_day > 31 then
    raise exception 'Billing day must be between 1 and 31.';
  end if;

  if expense_frequency = 'yearly'
     and (target_billing_month is null or target_billing_month < 1 or target_billing_month > 12) then
    raise exception 'Yearly recurring expenses require a billing month between 1 and 12.';
  end if;

  if expense_frequency = 'monthly' and target_billing_month is not null then
    raise exception 'Monthly recurring expenses cannot define a billing month.';
  end if;

  select *
  into selected_wallet
  from public.wallets
  where id = target_wallet_id
    and user_id = current_user_id
    and is_active = true;

  if not found then
    raise exception 'Wallet does not belong to the authenticated user.';
  end if;

  if target_category_id is not null and not exists (
    select 1
    from public.categories
    where id = target_category_id
      and user_id = current_user_id
  ) then
    raise exception 'Category does not belong to the authenticated user.';
  end if;

  insert into public.recurring_expenses (
    user_id,
    wallet_id,
    name,
    amount,
    type,
    frequency,
    billing_day,
    billing_month,
    category_id,
    notes
  )
  values (
    current_user_id,
    target_wallet_id,
    trim(expense_name),
    committed_amount,
    expense_type,
    expense_frequency,
    target_billing_day,
    case
      when expense_frequency = 'yearly' then target_billing_month
      else null
    end,
    target_category_id,
    nullif(trim(target_notes), '')
  )
  returning * into new_expense;

  return new_expense;
end;
$$;

create or replace function public.create_budget_provision(
  target_wallet_id uuid,
  provision_name text,
  planned_amount numeric(18,2),
  target_month date,
  target_recurrence text default 'once',
  target_category_id uuid default null,
  target_notes text default null
)
returns public.budget_provisions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  normalized_month date;
  selected_wallet public.wallets;
  new_provision public.budget_provisions;
begin
  current_user_id := auth.uid();
  normalized_month := date_trunc('month', target_month)::date;

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if planned_amount is null or planned_amount <= 0 then
    raise exception 'Budget provision amount must be greater than zero.';
  end if;

  if target_recurrence not in ('once', 'yearly') then
    raise exception 'Unsupported budget provision recurrence.';
  end if;

  select *
  into selected_wallet
  from public.wallets
  where id = target_wallet_id
    and user_id = current_user_id
    and is_active = true;

  if not found then
    raise exception 'Wallet does not belong to the authenticated user.';
  end if;

  if target_category_id is not null and not exists (
    select 1
    from public.categories
    where id = target_category_id
      and user_id = current_user_id
  ) then
    raise exception 'Category does not belong to the authenticated user.';
  end if;

  insert into public.budget_provisions (
    user_id,
    wallet_id,
    name,
    amount,
    month,
    recurrence,
    category_id,
    notes
  )
  values (
    current_user_id,
    target_wallet_id,
    trim(provision_name),
    planned_amount,
    normalized_month,
    target_recurrence,
    target_category_id,
    nullif(trim(target_notes), '')
  )
  returning * into new_provision;

  return new_provision;
end;
$$;

create or replace function public.settle_recurring_expense(
  target_recurring_expense_id uuid,
  payment_amount numeric(18,2),
  target_payment_date date,
  payment_description text default null
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  selected_expense public.recurring_expenses;
  inserted_entry public.ledger_entries;
  normalized_description text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Recurring expense payment amount must be greater than zero.';
  end if;

  select *
  into selected_expense
  from public.recurring_expenses
  where id = target_recurring_expense_id
    and user_id = current_user_id
    and is_active = true;

  if not found then
    raise exception 'Recurring expense does not belong to the authenticated user.';
  end if;

  normalized_description := coalesce(
    nullif(trim(payment_description), ''),
    selected_expense.name
  );

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    amount,
    type,
    description,
    category_id,
    recurring_expense_id,
    date
  )
  values (
    current_user_id,
    selected_expense.wallet_id,
    payment_amount * -1,
    'recurring_expense_payment',
    normalized_description,
    selected_expense.category_id,
    selected_expense.id,
    target_payment_date
  )
  returning * into inserted_entry;

  return inserted_entry;
end;
$$;

create or replace function public.settle_budget_provision(
  target_budget_provision_id uuid,
  payment_amount numeric(18,2),
  target_payment_date date,
  payment_description text default null
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  selected_provision public.budget_provisions;
  inserted_entry public.ledger_entries;
  normalized_description text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Budget provision payment amount must be greater than zero.';
  end if;

  select *
  into selected_provision
  from public.budget_provisions
  where id = target_budget_provision_id
    and user_id = current_user_id
    and is_active = true;

  if not found then
    raise exception 'Budget provision does not belong to the authenticated user.';
  end if;

  normalized_description := coalesce(
    nullif(trim(payment_description), ''),
    selected_provision.name
  );

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    amount,
    type,
    description,
    category_id,
    budget_provision_id,
    date
  )
  values (
    current_user_id,
    selected_provision.wallet_id,
    payment_amount * -1,
    'budget_provision_payment',
    normalized_description,
    selected_provision.category_id,
    selected_provision.id,
    target_payment_date
  )
  returning * into inserted_entry;

  return inserted_entry;
end;
$$;

grant execute on function public.create_recurring_expense(
  uuid,
  text,
  numeric,
  text,
  text,
  integer,
  integer,
  uuid,
  text
)
to authenticated;

grant execute on function public.create_budget_provision(
  uuid,
  text,
  numeric,
  date,
  text,
  uuid,
  text
)
to authenticated;

grant execute on function public.settle_recurring_expense(
  uuid,
  numeric,
  date,
  text
)
to authenticated;

grant execute on function public.settle_budget_provision(
  uuid,
  numeric,
  date,
  text
)
to authenticated;
