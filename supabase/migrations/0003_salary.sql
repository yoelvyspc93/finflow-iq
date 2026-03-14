create table if not exists public.salary_periods (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_month date not null
    check (period_month = date_trunc('month', period_month)::date),
  currency text not null
    check (currency in ('USD', 'CUP')),
  expected_amount numeric(18,2) not null
    check (expected_amount > 0),
  covered_amount numeric(18,2) not null default 0
    check (covered_amount >= 0 and covered_amount <= expected_amount),
  status text not null default 'pending'
    check (status in ('pending', 'partial', 'covered')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, period_month, currency)
);

create table if not exists public.salary_payments (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  ledger_entry_id uuid not null unique references public.ledger_entries(id) on delete restrict,
  currency text not null
    check (currency in ('USD', 'CUP')),
  gross_amount numeric(18,2) not null
    check (gross_amount > 0),
  allocated_amount numeric(18,2) not null default 0
    check (allocated_amount >= 0 and allocated_amount <= gross_amount),
  status text not null default 'unallocated'
    check (status in ('unallocated', 'partial', 'allocated')),
  payment_date date not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.salary_allocations (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  salary_payment_id uuid not null references public.salary_payments(id) on delete cascade,
  salary_period_id uuid not null references public.salary_periods(id) on delete cascade,
  amount numeric(18,2) not null
    check (amount > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (salary_payment_id, salary_period_id)
);

create index if not exists salary_periods_user_id_period_month_idx
  on public.salary_periods (user_id, period_month desc);
create index if not exists salary_payments_user_id_payment_date_idx
  on public.salary_payments (user_id, payment_date desc, created_at desc);
create index if not exists salary_payments_wallet_id_payment_date_idx
  on public.salary_payments (wallet_id, payment_date desc);
create index if not exists salary_allocations_user_id_period_id_idx
  on public.salary_allocations (user_id, salary_period_id);
create index if not exists salary_allocations_payment_id_idx
  on public.salary_allocations (salary_payment_id);

drop trigger if exists salary_periods_set_updated_at on public.salary_periods;
create trigger salary_periods_set_updated_at
before update on public.salary_periods
for each row
execute function public.set_updated_at();

drop trigger if exists salary_payments_set_updated_at on public.salary_payments;
create trigger salary_payments_set_updated_at
before update on public.salary_payments
for each row
execute function public.set_updated_at();

create or replace function public.refresh_salary_period_snapshot(target_salary_period_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  next_covered_amount numeric(18,2);
begin
  select coalesce(sum(amount), 0)
  into next_covered_amount
  from public.salary_allocations
  where salary_period_id = target_salary_period_id;

  update public.salary_periods
  set covered_amount = next_covered_amount,
      status = case
        when next_covered_amount = 0 then 'pending'
        when next_covered_amount < expected_amount then 'partial'
        else 'covered'
      end,
      updated_at = timezone('utc', now())
  where id = target_salary_period_id;
end;
$$;

create or replace function public.refresh_salary_payment_snapshot(target_salary_payment_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  next_allocated_amount numeric(18,2);
begin
  select coalesce(sum(amount), 0)
  into next_allocated_amount
  from public.salary_allocations
  where salary_payment_id = target_salary_payment_id;

  update public.salary_payments
  set allocated_amount = next_allocated_amount,
      status = case
        when next_allocated_amount = 0 then 'unallocated'
        when next_allocated_amount < gross_amount then 'partial'
        else 'allocated'
      end,
      updated_at = timezone('utc', now())
  where id = target_salary_payment_id;
end;
$$;

create or replace function public.handle_salary_allocation_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.refresh_salary_payment_snapshot(
    coalesce(new.salary_payment_id, old.salary_payment_id)
  );

  perform public.refresh_salary_period_snapshot(
    coalesce(new.salary_period_id, old.salary_period_id)
  );

  if tg_op = 'UPDATE'
     and new.salary_payment_id is distinct from old.salary_payment_id then
    perform public.refresh_salary_payment_snapshot(old.salary_payment_id);
  end if;

  if tg_op = 'UPDATE'
     and new.salary_period_id is distinct from old.salary_period_id then
    perform public.refresh_salary_period_snapshot(old.salary_period_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists salary_allocations_refresh_snapshots on public.salary_allocations;
create trigger salary_allocations_refresh_snapshots
after insert or update or delete on public.salary_allocations
for each row
execute function public.handle_salary_allocation_change();

alter table public.salary_periods enable row level security;
alter table public.salary_payments enable row level security;
alter table public.salary_allocations enable row level security;

drop policy if exists "salary_periods_select_own" on public.salary_periods;
create policy "salary_periods_select_own"
on public.salary_periods
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "salary_payments_select_own" on public.salary_payments;
create policy "salary_payments_select_own"
on public.salary_payments
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "salary_allocations_select_own" on public.salary_allocations;
create policy "salary_allocations_select_own"
on public.salary_allocations
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.create_salary_period(
  target_period_month date,
  target_currency text,
  expected_salary_amount numeric(18,2),
  target_notes text default null
)
returns public.salary_periods
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  normalized_period_month date;
  new_period public.salary_periods;
begin
  current_user_id := auth.uid();
  normalized_period_month := date_trunc('month', target_period_month)::date;

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_currency not in ('USD', 'CUP') then
    raise exception 'Unsupported salary currency.';
  end if;

  if expected_salary_amount is null or expected_salary_amount <= 0 then
    raise exception 'Expected salary amount must be greater than zero.';
  end if;

  insert into public.salary_periods (
    user_id,
    period_month,
    currency,
    expected_amount,
    notes
  )
  values (
    current_user_id,
    normalized_period_month,
    target_currency,
    expected_salary_amount,
    nullif(trim(target_notes), '')
  )
  returning * into new_period;

  return new_period;
end;
$$;

create or replace function public.register_salary_payment(
  target_wallet_id uuid,
  payment_amount numeric(18,2),
  payment_currency text,
  target_payment_date date,
  allocation_period_ids uuid[] default '{}',
  allocation_amounts numeric[] default '{}',
  payment_description text default null
)
returns public.salary_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  selected_wallet public.wallets;
  current_period_id uuid;
  current_allocation_amount numeric(18,2);
  total_allocated_amount numeric(18,2);
  inserted_ledger_entry public.ledger_entries;
  new_payment public.salary_payments;
  allocation_index integer;
  locked_period_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if payment_currency not in ('USD', 'CUP') then
    raise exception 'Unsupported salary currency.';
  end if;

  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  if cardinality(allocation_period_ids) <> cardinality(allocation_amounts) then
    raise exception 'Allocation arrays must have the same length.';
  end if;

  if cardinality(allocation_period_ids) <> (
    select count(distinct item.period_id)
    from unnest(coalesce(allocation_period_ids, '{}'::uuid[])) as item(period_id)
  ) then
    raise exception 'Duplicate salary periods are not allowed in a single payment.';
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

  if selected_wallet.currency <> payment_currency then
    raise exception 'Salary payment currency must match the wallet currency.';
  end if;

  select coalesce(sum(allocation_amount), 0)
  into total_allocated_amount
  from unnest(coalesce(allocation_amounts, '{}'::numeric[])) as item(allocation_amount);

  if total_allocated_amount > payment_amount then
    raise exception 'Allocated amount cannot exceed the payment amount.';
  end if;

  if cardinality(allocation_period_ids) > 0 then
    perform 1
    from public.salary_periods
    where id = any(allocation_period_ids)
      and user_id = current_user_id
      and currency = payment_currency
    order by id
    for update;

    get diagnostics locked_period_count = row_count;

    if locked_period_count <> cardinality(allocation_period_ids) then
      raise exception 'One or more salary periods are invalid for this payment.';
    end if;
  end if;

  for allocation_index in 1..coalesce(cardinality(allocation_period_ids), 0) loop
    current_period_id := allocation_period_ids[allocation_index];
    current_allocation_amount := allocation_amounts[allocation_index];

    if current_allocation_amount is null or current_allocation_amount <= 0 then
      raise exception 'Each salary allocation must be greater than zero.';
    end if;

    if exists (
      select 1
      from public.salary_periods
      where id = current_period_id
        and user_id = current_user_id
        and currency = payment_currency
        and covered_amount + current_allocation_amount > expected_amount
    ) then
      raise exception 'A salary allocation exceeds the remaining amount of a period.';
    end if;
  end loop;

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    amount,
    type,
    description,
    date
  )
  values (
    current_user_id,
    target_wallet_id,
    payment_amount,
    'salary_payment',
    nullif(trim(payment_description), ''),
    target_payment_date
  )
  returning * into inserted_ledger_entry;

  insert into public.salary_payments (
    user_id,
    wallet_id,
    ledger_entry_id,
    currency,
    gross_amount,
    payment_date,
    description
  )
  values (
    current_user_id,
    target_wallet_id,
    inserted_ledger_entry.id,
    payment_currency,
    payment_amount,
    target_payment_date,
    nullif(trim(payment_description), '')
  )
  returning * into new_payment;

  for allocation_index in 1..coalesce(cardinality(allocation_period_ids), 0) loop
    insert into public.salary_allocations (
      user_id,
      salary_payment_id,
      salary_period_id,
      amount
    )
    values (
      current_user_id,
      new_payment.id,
      allocation_period_ids[allocation_index],
      allocation_amounts[allocation_index]
    );
  end loop;

  perform public.refresh_salary_payment_snapshot(new_payment.id);

  select *
  into new_payment
  from public.salary_payments
  where id = new_payment.id;

  return new_payment;
end;
$$;

grant execute on function public.create_salary_period(date, text, numeric, text)
to authenticated;
grant execute on function public.register_salary_payment(
  uuid,
  numeric,
  text,
  date,
  uuid[],
  numeric[],
  text
)
to authenticated;
