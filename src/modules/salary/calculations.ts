import type {
  SalaryPayment,
  SalaryPeriod,
} from "@/modules/salary/types";

export type SalaryOverview = {
  coveredPeriods: number;
  lastPaymentDate: string | null;
  monthsWithoutPayment: number;
  pendingTotal: number;
  totalAllocated: number;
  totalReceived: number;
};

export function getSalaryPeriodPendingAmount(period: SalaryPeriod) {
  return Math.max(period.expectedAmount - period.coveredAmount, 0);
}

export function calculateSalaryPendingTotal(periods: SalaryPeriod[]) {
  return periods.reduce(
    (total, period) => total + getSalaryPeriodPendingAmount(period),
    0,
  );
}

export function calculateMonthsWithoutPayment(periods: SalaryPeriod[]) {
  return periods.filter((period) => period.coveredAmount === 0).length;
}

export function calculateSalaryOverview(
  periods: SalaryPeriod[],
  payments: SalaryPayment[],
): SalaryOverview {
  const lastPaymentDate =
    [...payments]
      .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate))[0]
      ?.paymentDate ?? null;

  return {
    coveredPeriods: periods.filter((period) => period.status === "covered").length,
    lastPaymentDate,
    monthsWithoutPayment: calculateMonthsWithoutPayment(periods),
    pendingTotal: calculateSalaryPendingTotal(periods),
    totalAllocated: payments.reduce(
      (total, payment) => total + payment.allocatedAmount,
      0,
    ),
    totalReceived: payments.reduce(
      (total, payment) => total + payment.grossAmount,
      0,
    ),
  };
}
