create table if not exists public.currency_exchanges (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_wallet_id uuid not null references public.wallets(id) on delete restrict,
  to_wallet_id uuid not null references public.wallets(id) on delete restrict,
  exchange_out_entry_id uuid not null unique references public.ledger_entries(id) on delete restrict,
  exchange_in_entry_id uuid not null unique references public.ledger_entries(id) on delete restrict,
  from_amount numeric(18,2) not null
    check (from_amount > 0),
  to_amount numeric(18,2) not null
    check (to_amount > 0),
  exchange_rate numeric(18,6) not null
    check (exchange_rate > 0),
  transfer_date date not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  check (from_wallet_id <> to_wallet_id)
);

create index if not exists currency_exchanges_user_id_transfer_date_idx
  on public.currency_exchanges (user_id, transfer_date desc, created_at desc);
create index if not exists currency_exchanges_from_wallet_id_idx
  on public.currency_exchanges (from_wallet_id, transfer_date desc);
create index if not exists currency_exchanges_to_wallet_id_idx
  on public.currency_exchanges (to_wallet_id, transfer_date desc);

alter table public.currency_exchanges enable row level security;

drop policy if exists "currency_exchanges_select_own" on public.currency_exchanges;
create policy "currency_exchanges_select_own"
on public.currency_exchanges
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.transfer_between_wallets(
  source_wallet_id uuid,
  destination_wallet_id uuid,
  source_amount numeric(18,2),
  destination_amount numeric(18,2),
  quoted_exchange_rate numeric(18,6),
  target_transfer_date date,
  transfer_description text default null
)
returns public.currency_exchanges
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  source_wallet public.wallets;
  destination_wallet public.wallets;
  exchange_out_entry public.ledger_entries;
  exchange_in_entry public.ledger_entries;
  new_exchange public.currency_exchanges;
  normalized_description text;
begin
  current_user_id := auth.uid();
  normalized_description := nullif(trim(transfer_description), '');

  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if source_wallet_id = destination_wallet_id then
    raise exception 'Source and destination wallets must be different.';
  end if;

  if source_amount is null or source_amount <= 0 then
    raise exception 'Source amount must be greater than zero.';
  end if;

  if destination_amount is null or destination_amount <= 0 then
    raise exception 'Destination amount must be greater than zero.';
  end if;

  if quoted_exchange_rate is null or quoted_exchange_rate <= 0 then
    raise exception 'Exchange rate must be greater than zero.';
  end if;

  if round((source_amount * quoted_exchange_rate)::numeric, 2) <> destination_amount then
    raise exception 'Destination amount does not match the provided exchange rate.';
  end if;

  select *
  into source_wallet
  from public.wallets
  where id = source_wallet_id
    and user_id = current_user_id
    and is_active = true;

  if not found then
    raise exception 'Source wallet does not belong to the authenticated user.';
  end if;

  select *
  into destination_wallet
  from public.wallets
  where id = destination_wallet_id
    and user_id = current_user_id
    and is_active = true;

  if not found then
    raise exception 'Destination wallet does not belong to the authenticated user.';
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
    source_wallet_id,
    source_amount * -1,
    'exchange_out',
    normalized_description,
    target_transfer_date
  )
  returning * into exchange_out_entry;

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
    destination_wallet_id,
    destination_amount,
    'exchange_in',
    normalized_description,
    target_transfer_date
  )
  returning * into exchange_in_entry;

  insert into public.currency_exchanges (
    user_id,
    from_wallet_id,
    to_wallet_id,
    exchange_out_entry_id,
    exchange_in_entry_id,
    from_amount,
    to_amount,
    exchange_rate,
    transfer_date,
    description
  )
  values (
    current_user_id,
    source_wallet_id,
    destination_wallet_id,
    exchange_out_entry.id,
    exchange_in_entry.id,
    source_amount,
    destination_amount,
    quoted_exchange_rate,
    target_transfer_date,
    normalized_description
  )
  returning * into new_exchange;

  return new_exchange;
end;
$$;

grant execute on function public.transfer_between_wallets(
  uuid,
  uuid,
  numeric,
  numeric,
  numeric,
  date,
  text
)
to authenticated;
