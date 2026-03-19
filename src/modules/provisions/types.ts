import type { Tables } from "@/types/supabase";

export type BudgetProvisionRow = Tables<"budget_provisions">;

export type BudgetProvisionRecurrence = BudgetProvisionRow["recurrence"];

export type BudgetProvision = {
  amount: number;
  categoryId: string | null;
  createdAt: string;
  id: string;
  isActive: boolean;
  month: string;
  name: string;
  notes: string | null;
  recurrence: BudgetProvisionRecurrence;
  updatedAt: string;
  userId: string;
  walletId: string;
};

export type CreateBudgetProvisionInput = {
  amount: number;
  categoryId?: string | null;
  month: string;
  name: string;
  notes?: string | null;
  recurrence: BudgetProvisionRecurrence;
  walletId: string;
};

export type SettleBudgetProvisionInput = {
  amount: number;
  budgetProvisionId: string;
  date: string;
  description?: string | null;
};

export type CreateLocalBudgetProvisionInput = CreateBudgetProvisionInput & {
  userId: string;
};

export function mapBudgetProvision(row: BudgetProvisionRow): BudgetProvision {
  return {
    amount: row.amount,
    categoryId: row.category_id,
    createdAt: row.created_at,
    id: row.id,
    isActive: row.is_active,
    month: row.month,
    name: row.name,
    notes: row.notes,
    recurrence: row.recurrence,
    updatedAt: row.updated_at,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function createLocalBudgetProvision(
  input: CreateLocalBudgetProvisionInput,
): BudgetProvision {
  const now = new Date().toISOString();

  return {
    amount: input.amount,
    categoryId: input.categoryId ?? null,
    createdAt: now,
    id: `local-budget-provision-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,
    isActive: true,
    month: `${input.month.slice(0, 7)}-01`,
    name: input.name.trim(),
    notes: input.notes ?? null,
    recurrence: input.recurrence,
    updatedAt: now,
    userId: input.userId,
    walletId: input.walletId,
  };
}
