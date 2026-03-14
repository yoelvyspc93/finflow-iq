import { supabase } from "@/lib/supabase/client";
import { mapLedgerEntry, type LedgerEntry } from "@/modules/ledger/types";
import {
  createMockRecurringExpenses,
  mapRecurringExpense,
  type CreateRecurringExpenseInput,
  type RecurringExpense,
  type SettleRecurringExpenseInput,
} from "@/modules/commitments/types";

type ListRecurringExpensesArgs = {
  isDevBypass: boolean;
  userId: string;
};

type ListCommitmentPaymentEntriesArgs = {
  isDevBypass: boolean;
  month: string;
  userId: string;
  walletId?: string | null;
};

function getMonthRange(month: string) {
  const monthKey = month.slice(0, 7);
  const [year, monthNumber] = monthKey.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0))
    .toISOString()
    .slice(0, 10);

  return { monthEnd };
}

export async function listRecurringExpenses({
  isDevBypass,
  userId,
}: ListRecurringExpensesArgs): Promise<RecurringExpense[]> {
  if (isDevBypass) {
    return createMockRecurringExpenses(userId);
  }

  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("user_id", userId)
    .order("billing_month", { ascending: true, nullsFirst: true })
    .order("billing_day", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRecurringExpense);
}

export async function listCommitmentPaymentEntries({
  isDevBypass,
  month,
  userId,
  walletId,
}: ListCommitmentPaymentEntriesArgs): Promise<LedgerEntry[]> {
  if (isDevBypass) {
    return [];
  }

  const { monthEnd } = getMonthRange(month);

  let query = supabase
    .from("ledger_entries")
    .select("*")
    .eq("user_id", userId)
    .lte("date", monthEnd)
    .or("recurring_expense_id.not.is.null,budget_provision_id.not.is.null")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (walletId) {
    query = query.eq("wallet_id", walletId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapLedgerEntry);
}

export async function createRecurringExpense(
  input: CreateRecurringExpenseInput,
): Promise<RecurringExpense> {
  const { data, error } = await supabase.rpc("create_recurring_expense", {
    committed_amount: input.amount,
    expense_frequency: input.frequency,
    expense_name: input.name,
    expense_type: input.type,
    target_billing_day: input.billingDay,
    target_billing_month:
      input.frequency === "yearly" ? (input.billingMonth ?? undefined) : undefined,
    target_category_id: input.categoryId ?? undefined,
    target_notes: input.notes ?? undefined,
    target_wallet_id: input.walletId,
  });

  if (error) {
    throw error;
  }

  return mapRecurringExpense(data);
}

export async function settleRecurringExpense(
  input: SettleRecurringExpenseInput,
): Promise<LedgerEntry> {
  const { data, error } = await supabase.rpc("settle_recurring_expense", {
    payment_amount: input.amount,
    payment_description: input.description ?? undefined,
    target_payment_date: input.date,
    target_recurring_expense_id: input.recurringExpenseId,
  });

  if (error) {
    throw error;
  }

  return mapLedgerEntry(data);
}
