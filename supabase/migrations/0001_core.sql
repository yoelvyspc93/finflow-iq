create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.settings (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  savings_goal_percent integer not null default 20
    check (savings_goal_percent between 0 and 100),
  salary_reference_amount numeric(18,2),
  financial_month_start_day integer not null default 1
    check (financial_month_start_day between 1 and 28),
  usd_cup_rate numeric(18,6),
  avg_months_without_payment numeric(4,1) not null default 0
    check (avg_months_without_payment >= 0),
  ai_analysis_frequency text not null default 'each_transaction'
    check (ai_analysis_frequency in ('each_transaction', 'daily', 'manual')),
  alert_level text not null default 'normal'
    check (alert_level in ('conservative', 'normal', 'aggressive')),
  subscription_alert_days integer not null default 3
    check (subscription_alert_days in (1, 3, 7)),
  weekly_summary_day text not null default 'monday'
    check (weekly_summary_day in (
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    )),
  primary_currency text not null default 'USD'
    check (primary_currency in ('USD', 'CUP')),
  theme text not null default 'dark'
    check (theme in ('light', 'dark', 'auto')),
  date_format text not null default 'DD/MM/YYYY'
    check (date_format in ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wallets (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  currency text not null check (char_length(trim(currency)) > 0),
  color text,
  icon text,
  balance numeric(18,2) not null default 0,
  is_active boolean not null default true,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.income_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  icon text not null check (char_length(trim(icon)) > 0),
  color text not null check (char_length(trim(color)) > 0),
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create index if not exists settings_user_id_idx on public.settings (user_id);
create index if not exists wallets_user_id_idx on public.wallets (user_id);
create index if not exists wallets_user_id_position_idx on public.wallets (user_id, position);
create index if not exists income_sources_user_id_idx on public.income_sources (user_id);
create index if not exists categories_user_id_idx on public.categories (user_id);

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();

alter table public.settings enable row level security;
alter table public.wallets enable row level security;
alter table public.income_sources enable row level security;
alter table public.categories enable row level security;

drop policy if exists "settings_are_user_scoped" on public.settings;
create policy "settings_are_user_scoped"
on public.settings
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "wallets_are_user_scoped" on public.wallets;
create policy "wallets_are_user_scoped"
on public.wallets
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "income_sources_are_user_scoped" on public.income_sources;
create policy "income_sources_are_user_scoped"
on public.income_sources
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "categories_are_user_scoped" on public.categories;
create policy "categories_are_user_scoped"
on public.categories
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.bootstrap_user_defaults(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  insert into public.categories (user_id, name, icon, color, is_default)
  values
    (target_user_id, 'Comida', 'utensils', '#22C55E', true),
    (target_user_id, 'Transporte', 'car', '#3B82F6', true),
    (target_user_id, 'Salud', 'heart-pulse', '#EF4444', true),
    (target_user_id, 'Entretenimiento', 'film', '#8B5CF6', true),
    (target_user_id, 'Ropa', 'shirt', '#F59E0B', true),
    (target_user_id, 'Hogar', 'house', '#14B8A6', true),
    (target_user_id, 'Educacion', 'graduation-cap', '#6366F1', true),
    (target_user_id, 'Servicios', 'receipt', '#06B6D4', true),
    (target_user_id, 'Otro', 'shapes', '#94A3B8', true)
  on conflict (user_id, name) do nothing;

  insert into public.income_sources (user_id, name, is_default)
  values
    (target_user_id, 'Salario', true),
    (target_user_id, 'Freelance', true),
    (target_user_id, 'Regalo', true),
    (target_user_id, 'Venta', true),
    (target_user_id, 'Otro', true)
  on conflict (user_id, name) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bootstrap_user_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
