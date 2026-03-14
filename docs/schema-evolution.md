# Schema evolution rules

## Baseline rule
- Changes to finance tables are additive by default.
- Avoid destructive migrations during v1 unless the app has already been updated to stop reading the old shape.

## Ledger-specific rule
- `public.ledger_entries` is the long-lived audit table.
- Do not rename or drop columns from `ledger_entries` in v1.
- If a new domain needs a reference from the ledger, add it as a nullable foreign key first.

## Required rollout order
1. Add the new nullable column with `ALTER TABLE`.
2. Add the foreign key and the supporting index in the same migration.
3. Regenerate `src/types/supabase.ts`.
4. Update the app to treat the new field as optional.
5. Backfill historical rows only if the feature requires it.
6. Tighten constraints later, in a separate migration, after the app has been running safely on the new shape.

## Example
- If phase 12 needs `recurring_expense_id` in `ledger_entries`, add:
  - `alter table public.ledger_entries add column recurring_expense_id uuid null references public.recurring_expenses(id);`
  - `create index if not exists ledger_entries_recurring_expense_id_idx on public.ledger_entries (recurring_expense_id);`
- Ship the app reading `recurring_expense_id` as nullable before enforcing any stronger rule.

## Compatibility rules
- Never change a money column away from `numeric(18,2)`.
- Never change a rate column away from `numeric(18,6)`.
- Never introduce a client flow that depends on a column becoming non-null in the same release where the column is first added.
