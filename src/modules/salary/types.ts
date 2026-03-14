import type { Tables } from "@/types/supabase";

export type SalaryPeriodRow = Tables<"salary_periods">;
export type SalaryPaymentRow = Tables<"salary_payments">;
export type SalaryAllocationRow = Tables<"salary_allocations">;

export type SalaryCurrency = "USD" | "CUP";
export type SalaryPeriodStatus = "pending" | "partial" | "covered";
export type SalaryPaymentStatus = "unallocated" | "partial" | "allocated";

export type SalaryPeriod = {
  coveredAmount: number;
  createdAt: string;
  currency: SalaryCurrency;
  expectedAmount: number;
  id: string;
  notes: string | null;
  periodMonth: string;
  status: SalaryPeriodStatus;
  updatedAt: string;
  userId: string;
};

export type SalaryPayment = {
  allocatedAmount: number;
  createdAt: string;
  currency: SalaryCurrency;
  description: string | null;
  grossAmount: number;
  id: string;
  ledgerEntryId: string;
  paymentDate: string;
  status: SalaryPaymentStatus;
  updatedAt: string;
  userId: string;
  walletId: string;
};

export type SalaryAllocation = {
  amount: number;
  createdAt: string;
  id: string;
  salaryPaymentId: string;
  salaryPeriodId: string;
  userId: string;
};

export type SalaryAllocationInput = {
  amount: number;
  salaryPeriodId: string;
};

export type CreateSalaryPeriodInput = {
  currency: SalaryCurrency;
  expectedAmount: number;
  notes?: string | null;
  periodMonth: string;
};

export type RegisterSalaryPaymentInput = {
  allocations?: SalaryAllocationInput[];
  amount: number;
  currency: SalaryCurrency;
  description?: string | null;
  paymentDate: string;
  walletId: string;
};

export type CreateLocalSalaryPeriodInput = {
  currency: SalaryCurrency;
  expectedAmount: number;
  notes?: string | null;
  periodMonth: string;
  userId: string;
};

export type CreateLocalSalaryPaymentInput = {
  amount: number;
  currency: SalaryCurrency;
  description?: string | null;
  paymentDate: string;
  userId: string;
  walletId: string;
};

export type CreateLocalSalaryAllocationInput = {
  amount: number;
  salaryPaymentId: string;
  salaryPeriodId: string;
  userId: string;
};

export function mapSalaryPeriod(row: SalaryPeriodRow): SalaryPeriod {
  return {
    coveredAmount: row.covered_amount,
    createdAt: row.created_at,
    currency: row.currency as SalaryCurrency,
    expectedAmount: row.expected_amount,
    id: row.id,
    notes: row.notes,
    periodMonth: row.period_month,
    status: row.status as SalaryPeriodStatus,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapSalaryPayment(row: SalaryPaymentRow): SalaryPayment {
  return {
    allocatedAmount: row.allocated_amount,
    createdAt: row.created_at,
    currency: row.currency as SalaryCurrency,
    description: row.description,
    grossAmount: row.gross_amount,
    id: row.id,
    ledgerEntryId: row.ledger_entry_id,
    paymentDate: row.payment_date,
    status: row.status as SalaryPaymentStatus,
    updatedAt: row.updated_at,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function mapSalaryAllocation(row: SalaryAllocationRow): SalaryAllocation {
  return {
    amount: row.amount,
    createdAt: row.created_at,
    id: row.id,
    salaryPaymentId: row.salary_payment_id,
    salaryPeriodId: row.salary_period_id,
    userId: row.user_id,
  };
}

export function createMockSalaryPeriods(userId: string): SalaryPeriod[] {
  const now = new Date().toISOString();

  return [
    {
      coveredAmount: 0,
      createdAt: now,
      currency: "USD",
      expectedAmount: 450,
      id: "mock-salary-period-current",
      notes: "Nomina base",
      periodMonth: new Date().toISOString().slice(0, 7) + "-01",
      status: "pending",
      updatedAt: now,
      userId,
    },
  ];
}

export function createMockSalaryPayments(userId: string): SalaryPayment[] {
  return [
    {
      allocatedAmount: 0,
      createdAt: new Date().toISOString(),
      currency: "USD",
      description: "Cobro demo",
      grossAmount: 250,
      id: "mock-salary-payment-1",
      ledgerEntryId: "mock-ledger-salary-payment-1",
      paymentDate: new Date().toISOString().slice(0, 10),
      status: "unallocated",
      updatedAt: new Date().toISOString(),
      userId,
      walletId: "dev-wallet-primary",
    },
  ];
}

export function createMockSalaryAllocations(userId: string): SalaryAllocation[] {
  return [
    {
      amount: 0,
      createdAt: new Date().toISOString(),
      id: "mock-salary-allocation-empty",
      salaryPaymentId: "mock-salary-payment-1",
      salaryPeriodId: "mock-salary-period-current",
      userId,
    },
  ].filter((allocation) => allocation.amount > 0);
}

export function createLocalSalaryPeriod(
  input: CreateLocalSalaryPeriodInput,
): SalaryPeriod {
  const now = new Date().toISOString();

  return {
    coveredAmount: 0,
    createdAt: now,
    currency: input.currency,
    expectedAmount: input.expectedAmount,
    id: `local-salary-period-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    notes: input.notes ?? null,
    periodMonth: input.periodMonth,
    status: "pending",
    updatedAt: now,
    userId: input.userId,
  };
}

export function createLocalSalaryPayment(
  input: CreateLocalSalaryPaymentInput,
): SalaryPayment {
  const now = new Date().toISOString();

  return {
    allocatedAmount: 0,
    createdAt: now,
    currency: input.currency,
    description: input.description ?? null,
    grossAmount: input.amount,
    id: `local-salary-payment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ledgerEntryId: `local-ledger-salary-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    paymentDate: input.paymentDate,
    status: "unallocated",
    updatedAt: now,
    userId: input.userId,
    walletId: input.walletId,
  };
}

export function createLocalSalaryAllocation(
  input: CreateLocalSalaryAllocationInput,
): SalaryAllocation {
  return {
    amount: input.amount,
    createdAt: new Date().toISOString(),
    id: `local-salary-allocation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    salaryPaymentId: input.salaryPaymentId,
    salaryPeriodId: input.salaryPeriodId,
    userId: input.userId,
  };
}
