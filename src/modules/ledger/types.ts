import type { Tables } from "@/types/supabase";

export type LedgerEntryRow = Tables<"ledger_entries">;

export type LedgerEntryType = LedgerEntryRow["type"];

export type LedgerEntry = {
  amount: number;
  categoryId: string | null;
  createdAt: string;
  date: string;
  description: string | null;
  id: string;
  incomeSourceId: string | null;
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

export function mapLedgerEntry(row: LedgerEntryRow): LedgerEntry {
  return {
    amount: row.amount,
    categoryId: row.category_id,
    createdAt: row.created_at,
    date: row.date,
    description: row.description,
    id: row.id,
    incomeSourceId: row.income_source_id,
    type: row.type,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}
