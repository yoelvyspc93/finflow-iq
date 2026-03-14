# FinFlow IQ database contracts

## Monetary columns
- Every money amount is stored as `numeric(18,2)`.
- Every exchange or conversion rate is stored as `numeric(18,6)`.
- Do not introduce `float`, `real`, `double precision`, or integer cents in this codebase.
- When a new finance table is added, its monetary columns must follow the same contract.

## Phase 1 tables
- `settings`
- `wallets`
- `income_sources`
- `categories`

## Ownership and access
- Every row in phase 1 tables is user-scoped through `user_id`.
- Row Level Security is enabled on every user-scoped table.
- The only allowed client access pattern is `auth.uid() = user_id`.

## Default data bootstrap
- New users receive one `settings` row automatically.
- New users receive the default categories and income sources automatically.
- This bootstrap happens inside `public.handle_new_user()` after a row is inserted into `auth.users`.
- `supabase/seed.sql` stays reserved for optional fixtures. Runtime defaults are not duplicated there.

## Remote Supabase workflow
- This project targets a hosted Supabase project, not a mandatory local Docker stack.
- Migrations are applied with `yarn supabase:db:push` after linking the remote project.
- Auth redirects in `supabase/config.toml` are pushed with `yarn supabase:config:push`.
- Database types are refreshed from the linked cloud project with `yarn supabase:types`.

## Timestamp rules
- `created_at` is immutable after insert.
- `updated_at` is maintained by database triggers, not by the client.

## Future modules
- Salary, ledger, exchanges, commitments, goals, wishes, alerts, and AI tables must reuse these contracts.
- `wallets.balance` is cache data only. The future ledger will remain the source of truth.
