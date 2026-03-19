drop policy if exists "goal_contributions_select_own" on public.goal_contributions;
drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;

drop trigger if exists goal_contributions_validate_integrity on public.goal_contributions;
drop trigger if exists goals_validate_integrity on public.goals;
drop trigger if exists goals_set_updated_at on public.goals;

drop function if exists public.add_goal_contribution(
  uuid,
  uuid,
  numeric,
  date,
  text
);

drop function if exists public.add_goal_contribution(
  numeric,
  text,
  date,
  uuid,
  uuid
);

drop index if exists public.ledger_entries_goal_contribution_id_idx;

alter table public.ledger_entries
  drop constraint if exists ledger_entries_goal_contribution_id_fkey;

alter table public.ledger_entries
  drop column if exists goal_contribution_id;

create or replace function public.validate_planning_integrity()
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

  return new;
end;
$$;

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

  if new.type in ('income', 'salary_payment', 'exchange_in')
     and new.amount <= 0 then
    raise exception 'Entry type % requires a positive amount.', new.type;
  end if;

  if new.type in (
      'expense',
      'exchange_out',
      'recurring_expense_payment',
      'budget_provision_payment'
    )
     and new.amount >= 0 then
    raise exception 'Entry type % requires a negative amount.', new.type;
  end if;

  return new;
end;
$$;

alter table public.ledger_entries
  drop constraint if exists ledger_entries_type_check;

drop trigger if exists ledger_entries_prevent_update_delete on public.ledger_entries;

update public.ledger_entries
set type = 'adjustment'
where type in ('goal_deposit', 'goal_withdrawal');

alter table public.ledger_entries
  add constraint ledger_entries_type_check
  check (
    type in (
      'income',
      'salary_payment',
      'expense',
      'exchange_out',
      'exchange_in',
      'adjustment',
      'recurring_expense_payment',
      'budget_provision_payment'
    )
  );

create trigger ledger_entries_prevent_update_delete
before update or delete on public.ledger_entries
for each row
execute function public.prevent_ledger_mutation();

drop table if exists public.goal_contributions;
drop table if exists public.goals;
