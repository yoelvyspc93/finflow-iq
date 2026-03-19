import { supabase } from "@/lib/supabase/client";
import {
  mapLedgerEntry,
  type AdjustmentInput,
  type ExpenseInput,
  type LedgerEntry,
  type ManualIncomeInput,
  type WishPurchaseExpenseInput,
  type WalletBalanceReconciliation,
} from "@/modules/ledger/types";

type ListLedgerEntriesArgs = {
  limit?: number;
  userId: string;
  walletId?: string | null;
};

export async function listLedgerEntries({
  limit = 12,
  userId,
  walletId,
}: ListLedgerEntriesArgs): Promise<LedgerEntry[]> {
  let query = supabase
    .from("ledger_entries")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (walletId) {
    query = query.eq("wallet_id", walletId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapLedgerEntry);
}

export async function createManualIncome(
  input: ManualIncomeInput,
): Promise<LedgerEntry> {
  const { data, error } = await supabase.rpc("create_manual_income", {
    entry_date: input.date,
    entry_description: input.description ?? undefined,
    gross_amount: input.amount,
    target_income_source_id: input.incomeSourceId ?? undefined,
    target_wallet_id: input.walletId,
  });

  if (error) {
    throw error;
  }

  return mapLedgerEntry(data);
}

export async function createExpense(input: ExpenseInput): Promise<LedgerEntry> {
  const { data, error } = await supabase.rpc("create_expense", {
    entry_date: input.date,
    entry_description: input.description ?? undefined,
    gross_amount: input.amount,
    target_category_id: input.categoryId ?? undefined,
    target_wallet_id: input.walletId,
  });

  if (error) {
    throw error;
  }

  return mapLedgerEntry(data);
}

export async function createWishPurchaseExpense(
  input: WishPurchaseExpenseInput,
): Promise<LedgerEntry> {
  const { data, error } = await supabase.rpc("create_wish_purchase_expense", {
    entry_date: input.date,
    entry_description: input.description ?? undefined,
    gross_amount: input.amount,
    target_category_id: input.categoryId ?? undefined,
    target_wallet_id: input.walletId,
    target_wish_id: input.wishId,
  });

  if (error) {
    throw error;
  }

  return mapLedgerEntry(data);
}

export async function createAdjustment(
  input: AdjustmentInput,
): Promise<LedgerEntry> {
  const { data, error } = await supabase.rpc("create_adjustment", {
    entry_date: input.date,
    entry_description: input.description ?? undefined,
    signed_amount: input.amount,
    target_wallet_id: input.walletId,
  });

  if (error) {
    throw error;
  }

  return mapLedgerEntry(data);
}

export async function reconcileWalletBalance(
  walletId: string,
): Promise<WalletBalanceReconciliation> {
  const { data, error } = await supabase.rpc("reconcile_wallet_balance", {
    target_wallet_id: walletId,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    corrected: Boolean(row?.corrected),
    previousBalance: Number(row?.previous_balance ?? 0),
    recalculatedBalance: Number(row?.recalculated_balance ?? 0),
    walletId: String(row?.wallet_id ?? walletId),
  };
}
