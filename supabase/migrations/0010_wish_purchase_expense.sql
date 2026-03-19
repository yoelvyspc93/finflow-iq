alter table public.ledger_entries
  add column if not exists wish_id uuid references public.wishes(id) on delete set null;

create index if not exists ledger_entries_wish_id_idx
  on public.ledger_entries (wish_id);

alter table public.wishes
  add column if not exists actual_purchase_amount numeric(18,2),
  add column if not exists purchase_ledger_entry_id uuid references public.ledger_entries(id) on delete set null;

create unique index if not exists wishes_purchase_ledger_entry_id_key
  on public.wishes (purchase_ledger_entry_id)
  where purchase_ledger_entry_id is not null;

create or replace function public.validate_planning_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  purchase_entry public.ledger_entries;
begin
  if not exists (
    select 1
    from public.wallets
    where id = new.wallet_id
      and user_id = new.user_id
  ) then
    raise exception 'Wallet does not belong to the authenticated user.';
  end if;

  if tg_table_name = 'wishes' then
    if new.is_purchased and (
      new.actual_purchase_amount is not null or new.purchase_ledger_entry_id is not null
    ) then
      if new.purchased_at is null then
        raise exception 'Purchased wishes with purchase details must include purchased_at.';
      end if;

      if new.actual_purchase_amount is null or new.actual_purchase_amount <= 0 then
        raise exception 'Purchased wishes with purchase details must include a positive actual_purchase_amount.';
      end if;

      if new.purchase_ledger_entry_id is null then
        raise exception 'Purchased wishes with purchase details must include purchase_ledger_entry_id.';
      end if;

      select *
      into purchase_entry
      from public.ledger_entries
      where id = new.purchase_ledger_entry_id
        and user_id = new.user_id
        and wallet_id = new.wallet_id
        and type = 'expense';

      if not found then
        raise exception 'Purchase ledger entry does not belong to the authenticated user.';
      end if;

      if purchase_entry.wish_id is distinct from new.id then
        raise exception 'Purchase ledger entry must reference the purchased wish.';
      end if;
    elsif not new.is_purchased and (
      new.actual_purchase_amount is not null
      or new.purchase_ledger_entry_id is not null
      or new.purchased_at is not null
    ) then
      raise exception 'Pending wishes cannot define purchase details.';
    end if;
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

  if new.wish_id is not null and not exists (
    select 1
    from public.wishes
    where id = new.wish_id
      and user_id = new.user_id
      and wallet_id = new.wallet_id
      and is_purchased = false
  ) then
    raise exception 'Wish does not belong to the authenticated user or is already purchased.';
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

  if new.wish_id is not null and new.type <> 'expense' then
    raise exception 'wish_id can only be used with expense entries.';
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

create or replace function public.create_wish_purchase_expense(
  target_wallet_id uuid,
  target_wish_id uuid,
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
  selected_wish public.wishes;
  new_entry public.ledger_entries;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if gross_amount is null or gross_amount <= 0 then
    raise exception 'Expense amount must be greater than zero.';
  end if;

  select *
  into selected_wish
  from public.wishes
  where id = target_wish_id
    and user_id = current_user_id
    and wallet_id = target_wallet_id
    and is_purchased = false;

  if not found then
    raise exception 'Wish does not belong to the authenticated user or is already purchased.';
  end if;

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    amount,
    type,
    description,
    category_id,
    wish_id,
    date
  )
  values (
    current_user_id,
    target_wallet_id,
    gross_amount * -1,
    'expense',
    nullif(trim(entry_description), ''),
    target_category_id,
    target_wish_id,
    entry_date
  )
  returning * into new_entry;

  update public.wishes
  set is_purchased = true,
      estimated_amount = gross_amount,
      purchased_at = entry_date,
      actual_purchase_amount = gross_amount,
      purchase_ledger_entry_id = new_entry.id,
      updated_at = timezone('utc', now())
  where id = selected_wish.id;

  return new_entry;
end;
$$;

grant execute on function public.create_wish_purchase_expense(uuid, uuid, numeric, date, text, uuid)
to authenticated;
