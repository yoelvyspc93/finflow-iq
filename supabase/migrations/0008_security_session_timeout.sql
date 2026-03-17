alter table public.settings
  add column if not exists session_timeout_minutes integer not null default 5
  check (session_timeout_minutes in (0, 5, 10, 20, 30));

