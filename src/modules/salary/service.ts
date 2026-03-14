import { supabase } from "@/lib/supabase/client";
import {
  createMockSalaryAllocations,
  createMockSalaryPayments,
  createMockSalaryPeriods,
  mapSalaryAllocation,
  mapSalaryPayment,
  mapSalaryPeriod,
  type CreateSalaryPeriodInput,
  type RegisterSalaryPaymentInput,
  type SalaryAllocation,
  type SalaryPayment,
  type SalaryPeriod,
} from "@/modules/salary/types";

type SalaryListArgs = {
  isDevBypass: boolean;
  userId: string;
};

export async function listSalaryPeriods({
  isDevBypass,
  userId,
}: SalaryListArgs): Promise<SalaryPeriod[]> {
  if (isDevBypass) {
    return createMockSalaryPeriods(userId);
  }

  const { data, error } = await supabase
    .from("salary_periods")
    .select("*")
    .eq("user_id", userId)
    .order("period_month", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSalaryPeriod);
}

export async function listSalaryPayments({
  isDevBypass,
  userId,
}: SalaryListArgs): Promise<SalaryPayment[]> {
  if (isDevBypass) {
    return createMockSalaryPayments(userId);
  }

  const { data, error } = await supabase
    .from("salary_payments")
    .select("*")
    .eq("user_id", userId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSalaryPayment);
}

export async function listSalaryAllocations({
  isDevBypass,
  userId,
}: SalaryListArgs): Promise<SalaryAllocation[]> {
  if (isDevBypass) {
    return createMockSalaryAllocations(userId);
  }

  const { data, error } = await supabase
    .from("salary_allocations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSalaryAllocation);
}

export async function createSalaryPeriod(
  input: CreateSalaryPeriodInput,
): Promise<SalaryPeriod> {
  const { data, error } = await supabase.rpc("create_salary_period", {
    expected_salary_amount: input.expectedAmount,
    target_currency: input.currency,
    target_notes: input.notes ?? undefined,
    target_period_month: input.periodMonth,
  });

  if (error) {
    throw error;
  }

  return mapSalaryPeriod(data);
}

export async function registerSalaryPayment(
  input: RegisterSalaryPaymentInput,
): Promise<SalaryPayment> {
  const allocationPeriodIds =
    input.allocations?.map((allocation) => allocation.salaryPeriodId) ?? [];
  const allocationAmounts =
    input.allocations?.map((allocation) => allocation.amount) ?? [];

  const { data, error } = await supabase.rpc("register_salary_payment", {
    allocation_amounts: allocationAmounts,
    allocation_period_ids: allocationPeriodIds,
    payment_amount: input.amount,
    payment_currency: input.currency,
    payment_description: input.description ?? undefined,
    target_payment_date: input.paymentDate,
    target_wallet_id: input.walletId,
  });

  if (error) {
    throw error;
  }

  return mapSalaryPayment(data);
}
