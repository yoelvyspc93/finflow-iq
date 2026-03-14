create table if not exists public.ledger_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  amount numeric(18,2) not null check (amount <> 0),
  type text not null
    check (
      type in (
        'income',
        'salary_payment',
        'expense',
        'exchange_out',
        'exchange_in',
        'goal_deposit',
        'goal_withdrawal',
        'adjustment'
      )
    ),
  description text,
  category_id uuid references public.categories(id) on delete set null,
  income_source_id uuid references public.income_sources(id) on delete set null,
  date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ledger_entries_user_id_date_idx
  on public.ledger_entries (user_id, date desc, created_at desc);
create index if not exists ledger_entries_wallet_id_date_idx
  on public.ledger_entries (wallet_id, date desc, created_at desc);
create index if not exists ledger_entries_user_id_type_idx
  on public.ledger_entries (user_id, type);
create index if not exists ledger_entries_category_id_idx
  on public.ledger_entries (category_id);
create index if not exists ledger_entries_income_source_id_idx
  on public.ledger_entries (income_source_id);

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

  if new.type in ('income', 'salary_payment', 'exchange_in', 'goal_withdrawal')
     and new.amount <= 0 then
    raise exception 'Entry type % requires a positive amount.', new.type;
  end if;

  if new.type in ('expense', 'exchange_out', 'goal_deposit')
     and new.amount >= 0 then
    raise exception 'Entry type % requires a negative amount.', new.type;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ledger_entries is immutable. Use an adjustment entry instead.';
end;
$$;

create or replace function public.apply_wallet_balance_from_ledger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.wallets
  set balance = balance + new.amount,
      updated_at = timezone('utc', now())
  where id = new.wallet_id
    and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists ledger_entries_validate_before_insert on public.ledger_entries;
create trigger ledger_entries_validate_before_insert
before insert on public.ledger_entries
for each row
execute function public.validate_ledger_entry_integrity();

drop trigger if exists ledger_entries_after_insert_balance on public.ledger_entries;
create trigger ledger_entries_after_insert_balance
after insert on public.ledger_entries
for each row
execute function public.apply_wallet_balance_from_ledger();

drop trigger if exists ledger_entries_prevent_update_delete on public.ledger_entries;
create trigger ledger_entries_prevent_update_delete
before update or delete on public.ledger_entries
for each row
execute function public.prevent_ledger_mutation();

alter table public.ledger_entries enable row level security;

drop policy if exists "ledger_entries_select_own" on public.ledger_entries;
create policy "ledger_entries_select_own"
on public.ledger_entries
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.create_manual_income(
  target_wallet_id uuid,
  gross_amount numeric(18,2),
  entry_date date,
  entry_description text default null,
  target_income_source_id uuid default null
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  new_entry public.ledger_entries;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if gross_amount is null or gross_amount <= 0 then
    raise exception 'Income amount must be greater than zero.';
  end if;

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    amount,
    type,
    description,
    income_source_id,
    date
  )
  values (
    current_user_id,
    target_wallet_id,
    gross_amount,
    'income',
    nullif(trim(entry_description), ''),
    target_income_source_id,
    entry_date
  )
  returning * into new_entry;

  return new_entry;
end;
$$;

create or replace function public.create_expense(
  target_wallet_id uuid,
  gross_amount numeric(18,2),
  entry_date date,
  entry_description text default null,
  target_category_id uuid default null
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  new_entry public.ledger_entries;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if gross_amount is null or gross_amount <= 0 then
    raise exception 'Expense amount must be greater than zero.';
  end if;

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    amount,
    type,
    description,
    category_id,
    date
  )
  values (
    current_user_id,
    target_wallet_id,
    gross_amount * -1,
    'expense',
    nullif(trim(entry_description), ''),
    target_category_id,
    entry_date
  )
  returning * into new_entry;

  return new_entry;
end;
$$;

create or replace function public.create_adjustment(
  target_wallet_id uuid,
  signed_amount numeric(18,2),
  entry_date date,
  entry_description text default null
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  new_entry public.ledger_entries;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if signed_amount is null or signed_amount = 0 then
    raise exception 'Adjustment amount must be different from zero.';
  end if;

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
    signed_amount,
    'adjustment',
    nullif(trim(entry_description), ''),
    entry_date
  )
  returning * into new_entry;

  return new_entry;
end;
$$;

create or replace function public.reconcile_wallet_balance(target_wallet_id uuid)
returns table (
  wallet_id uuid,
  previous_balance numeric(18,2),
  recalculated_balance numeric(18,2),
  corrected boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  existing_balance numeric(18,2);
  computed_balance numeric(18,2);
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select balance
  into existing_balance
  from public.wallets
  where id = target_wallet_id
    and user_id = current_user_id;

  if not found then
    raise exception 'Wallet does not belong to the authenticated user.';
  end if;

  select coalesce(sum(amount), 0)
  into computed_balance
  from public.ledger_entries
  where wallet_id = target_wallet_id
    and user_id = current_user_id;

  update public.wallets
  set balance = computed_balance,
      updated_at = timezone('utc', now())
  where id = target_wallet_id
    and user_id = current_user_id;

  return query
  select
    target_wallet_id,
    existing_balance,
    computed_balance,
    existing_balance is distinct from computed_balance;
end;
$$;

grant execute on function public.create_manual_income(uuid, numeric, date, text, uuid)
to authenticated;
grant execute on function public.create_expense(uuid, numeric, date, text, uuid)
to authenticated;
grant execute on function public.create_adjustment(uuid, numeric, date, text)
to authenticated;
grant execute on function public.reconcile_wallet_balance(uuid)
to authenticated;
