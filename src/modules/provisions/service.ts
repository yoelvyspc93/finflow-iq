import { supabase } from "@/lib/supabase/client";
import { mapLedgerEntry, type LedgerEntry } from "@/modules/ledger/types";
import {
  createMockBudgetProvisions,
  mapBudgetProvision,
  type BudgetProvision,
  type CreateBudgetProvisionInput,
  type SettleBudgetProvisionInput,
} from "@/modules/provisions/types";

type ListBudgetProvisionsArgs = {
  isDevBypass: boolean;
  userId: string;
};

export async function listBudgetProvisions({
  isDevBypass,
  userId,
}: ListBudgetProvisionsArgs): Promise<BudgetProvision[]> {
  if (isDevBypass) {
    return createMockBudgetProvisions(userId);
  }

  const { data, error } = await supabase
    .from("budget_provisions")
    .select("*")
    .eq("user_id", userId)
    .order("month", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBudgetProvision);
}

export async function createBudgetProvision(
  input: CreateBudgetProvisionInput,
): Promise<BudgetProvision> {
  const { data, error } = await supabase.rpc("create_budget_provision", {
    planned_amount: input.amount,
    provision_name: input.name,
    target_category_id: input.categoryId ?? undefined,
    target_month: input.month,
    target_notes: input.notes ?? undefined,
    target_recurrence: input.recurrence,
    target_wallet_id: input.walletId,
  });

  if (error) {
    throw error;
  }

  return mapBudgetProvision(data);
}

export async function settleBudgetProvision(
  input: SettleBudgetProvisionInput,
): Promise<LedgerEntry> {
  const { data, error } = await supabase.rpc("settle_budget_provision", {
    payment_amount: input.amount,
    payment_description: input.description ?? undefined,
    target_budget_provision_id: input.budgetProvisionId,
    target_payment_date: input.date,
  });

  if (error) {
    throw error;
  }

  return mapLedgerEntry(data);
}
