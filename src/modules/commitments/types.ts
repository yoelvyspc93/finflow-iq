import type { Tables } from "@/types/supabase";

export type RecurringExpenseRow = Tables<"recurring_expenses">;

export type RecurringExpenseType = RecurringExpenseRow["type"];
export type RecurringExpenseFrequency = RecurringExpenseRow["frequency"];

export type RecurringExpense = {
  amount: number;
  billingDay: number;
  billingMonth: number | null;
  categoryId: string | null;
  createdAt: string;
  frequency: RecurringExpenseFrequency;
  id: string;
  isActive: boolean;
  name: string;
  notes: string | null;
  type: RecurringExpenseType;
  updatedAt: string;
  userId: string;
  walletId: string;
};

export type CreateRecurringExpenseInput = {
  amount: number;
  billingDay: number;
  billingMonth?: number | null;
  categoryId?: string | null;
  frequency: RecurringExpenseFrequency;
  name: string;
  notes?: string | null;
  type: RecurringExpenseType;
  walletId: string;
};

export type SettleRecurringExpenseInput = {
  amount: number;
  date: string;
  description?: string | null;
  recurringExpenseId: string;
};

export type CreateLocalRecurringExpenseInput = CreateRecurringExpenseInput & {
  userId: string;
};

export function mapRecurringExpense(
  row: RecurringExpenseRow,
): RecurringExpense {
  return {
    amount: row.amount,
    billingDay: row.billing_day,
    billingMonth: row.billing_month,
    categoryId: row.category_id,
    createdAt: row.created_at,
    frequency: row.frequency,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    notes: row.notes,
    type: row.type,
    updatedAt: row.updated_at,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function createMockRecurringExpenses(
  userId: string,
): RecurringExpense[] {
  const now = new Date().toISOString();

  return [
    {
      amount: 14.99,
      billingDay: 8,
      billingMonth: null,
      categoryId: null,
      createdAt: now,
      frequency: "monthly",
      id: "mock-recurring-expense-1",
      isActive: true,
      name: "Netflix",
      notes: "Suscripcion principal",
      type: "subscription",
      updatedAt: now,
      userId,
      walletId: "dev-wallet-primary",
    },
    {
      amount: 120,
      billingDay: 20,
      billingMonth: 12,
      categoryId: null,
      createdAt: now,
      frequency: "yearly",
      id: "mock-recurring-expense-2",
      isActive: true,
      name: "Dominio y hosting",
      notes: null,
      type: "fixed_expense",
      updatedAt: now,
      userId,
      walletId: "dev-wallet-primary",
    },
  ];
}

export function createLocalRecurringExpense(
  input: CreateLocalRecurringExpenseInput,
): RecurringExpense {
  const now = new Date().toISOString();

  return {
    amount: input.amount,
    billingDay: input.billingDay,
    billingMonth:
      input.frequency === "yearly" ? (input.billingMonth ?? null) : null,
    categoryId: input.categoryId ?? null,
    createdAt: now,
    frequency: input.frequency,
    id: `local-recurring-expense-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,
    isActive: true,
    name: input.name.trim(),
    notes: input.notes ?? null,
    type: input.type,
    updatedAt: now,
    userId: input.userId,
    walletId: input.walletId,
  };
}
