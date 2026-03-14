import type { Tables } from "@/types/supabase";

export type LedgerEntryRow = Tables<"ledger_entries">;

export type LedgerEntryType = LedgerEntryRow["type"];

export type LedgerEntry = {
  amount: number;
  budgetProvisionId: string | null;
  categoryId: string | null;
  createdAt: string;
  date: string;
  description: string | null;
  id: string;
  incomeSourceId: string | null;
  recurringExpenseId: string | null;
  type: LedgerEntryType;
  userId: string;
  walletId: string;
};

export type LedgerEntryInputBase = {
  amount: number;
  date: string;
  description?: string | null;
  walletId: string;
};

export type ManualIncomeInput = LedgerEntryInputBase & {
  incomeSourceId?: string | null;
};

export type ExpenseInput = LedgerEntryInputBase & {
  categoryId?: string | null;
};

export type AdjustmentInput = LedgerEntryInputBase;

export type WalletBalanceReconciliation = {
  corrected: boolean;
  previousBalance: number;
  recalculatedBalance: number;
  walletId: string;
};

export type CreateLocalLedgerEntryInput = {
  amount: number;
  budgetProvisionId?: string | null;
  categoryId?: string | null;
  date: string;
  description?: string | null;
  incomeSourceId?: string | null;
  recurringExpenseId?: string | null;
  type: LedgerEntryType;
  userId: string;
  walletId: string;
};

export function mapLedgerEntry(row: LedgerEntryRow): LedgerEntry {
  return {
    amount: row.amount,
    budgetProvisionId: row.budget_provision_id,
    categoryId: row.category_id,
    createdAt: row.created_at,
    date: row.date,
    description: row.description,
    id: row.id,
    incomeSourceId: row.income_source_id,
    recurringExpenseId: row.recurring_expense_id,
    type: row.type,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function createLocalLedgerEntry(
  input: CreateLocalLedgerEntryInput,
): LedgerEntry {
  return {
    amount: input.amount,
    budgetProvisionId: input.budgetProvisionId ?? null,
    categoryId: input.categoryId ?? null,
    createdAt: new Date().toISOString(),
    date: input.date,
    description: input.description ?? null,
    id: `local-ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    incomeSourceId: input.incomeSourceId ?? null,
    recurringExpenseId: input.recurringExpenseId ?? null,
    type: input.type,
    userId: input.userId,
    walletId: input.walletId,
  };
}

export function sortLedgerEntries(entries: LedgerEntry[]) {
  return [...entries].sort((left, right) => {
    const leftStamp = `${left.date}T${left.createdAt}`;
    const rightStamp = `${right.date}T${right.createdAt}`;

    if (leftStamp === rightStamp) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    return rightStamp.localeCompare(leftStamp);
  });
}
