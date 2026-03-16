create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) > 0),
  last_name text not null check (char_length(trim(last_name)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_last_name_idx on public.profiles (last_name);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_are_user_scoped" on public.profiles;
create policy "profiles_are_user_scoped"
on public.profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.bootstrap_user_profile(target_user_id uuid, target_metadata jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_first_name text;
  resolved_last_name text;
begin
  resolved_first_name := nullif(trim(coalesce(target_metadata ->> 'first_name', '')), '');
  resolved_last_name := nullif(trim(coalesce(target_metadata ->> 'last_name', '')), '');

  insert into public.profiles (user_id, first_name, last_name)
  values (
    target_user_id,
    coalesce(resolved_first_name, 'Usuario'),
    coalesce(resolved_last_name, 'Sin apellido')
  )
  on conflict (user_id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    updated_at = timezone('utc', now());
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
  perform public.bootstrap_user_profile(new.id, new.raw_user_meta_data);
  return new;
end;
$$;

