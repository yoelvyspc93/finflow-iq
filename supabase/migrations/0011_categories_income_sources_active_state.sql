alter table public.categories
add column if not exists is_active boolean not null default true;

alter table public.income_sources
add column if not exists is_active boolean not null default true;
