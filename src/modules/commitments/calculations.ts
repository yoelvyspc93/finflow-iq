import type { LedgerEntry } from "@/modules/ledger/types";
import type { BudgetProvision } from "@/modules/provisions/types";
import type { RecurringExpense } from "@/modules/commitments/types";

export type RecurringExpenseMonthlySnapshot = {
  appliesToMonth: boolean;
  committedAmount: number;
  expense: RecurringExpense;
  paidAmount: number;
  remainingAmount: number;
};

export type BudgetProvisionMonthlySnapshot = {
  appliesToMonth: boolean;
  committedAmount: number;
  paidAmount: number;
  provision: BudgetProvision;
  remainingAmount: number;
};

export type CommitmentOverview = {
  activeMonth: string;
  budgetProvisionCommitted: number;
  budgetProvisionPaid: number;
  budgetProvisionRemaining: number;
  provisions: BudgetProvisionMonthlySnapshot[];
  recurringCommitted: number;
  recurringExpenses: RecurringExpenseMonthlySnapshot[];
  recurringPaid: number;
  recurringRemaining: number;
  totalCommitted: number;
  totalPaid: number;
  totalRemaining: number;
  walletId: string | null;
};

type CalculateCommitmentOverviewArgs = {
  budgetProvisions: BudgetProvision[];
  month: string;
  paymentEntries: LedgerEntry[];
  recurringExpenses: RecurringExpense[];
  walletId?: string | null;
};

function normalizeMonthKey(value: string) {
  return value.slice(0, 7);
}

function getMonthEnd(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function getYear(value: string) {
  return Number.parseInt(value.slice(0, 4), 10);
}

function getMonthNumber(value: string) {
  return Number.parseInt(value.slice(5, 7), 10);
}

function matchesWallet(
  walletId: string | null | undefined,
  targetWalletId: string,
) {
  return !walletId || walletId === targetWalletId;
}

function sumAbsoluteAmounts(entries: LedgerEntry[]) {
  return entries.reduce((total, entry) => total + Math.abs(entry.amount), 0);
}

export function calculateCommitmentOverview({
  budgetProvisions,
  month,
  paymentEntries,
  recurringExpenses,
  walletId = null,
}: CalculateCommitmentOverviewArgs): CommitmentOverview {
  const monthKey = normalizeMonthKey(month);
  const monthEnd = getMonthEnd(monthKey);
  const targetMonthNumber = getMonthNumber(`${monthKey}-01`);
  const targetYear = getYear(`${monthKey}-01`);

  const recurringSnapshots = recurringExpenses
    .filter((expense) => matchesWallet(walletId, expense.walletId))
    .map<RecurringExpenseMonthlySnapshot>((expense) => {
      const appliesToMonth =
        expense.isActive &&
        (expense.frequency === "monthly" ||
          expense.billingMonth === targetMonthNumber);

      const paidEntries = paymentEntries.filter(
        (entry) =>
          entry.recurringExpenseId === expense.id &&
          entry.date.slice(0, 7) === monthKey,
      );
      const paidAmount = sumAbsoluteAmounts(paidEntries);
      const committedAmount = appliesToMonth ? expense.amount : 0;
      const remainingAmount = Math.max(0, committedAmount - paidAmount);

      return {
        appliesToMonth,
        committedAmount,
        expense,
        paidAmount,
        remainingAmount,
      };
    });

  const provisionSnapshots = budgetProvisions
    .filter((provision) => matchesWallet(walletId, provision.walletId))
    .map<BudgetProvisionMonthlySnapshot>((provision) => {
      const appliesToMonth =
        provision.isActive &&
        (provision.recurrence === "once"
          ? provision.month.slice(0, 7) === monthKey
          : getMonthNumber(provision.month) === targetMonthNumber);

      const paidEntries = paymentEntries.filter((entry) => {
        if (entry.budgetProvisionId !== provision.id) {
          return false;
        }

        if (provision.recurrence === "once") {
          return entry.date <= monthEnd;
        }

        return getYear(entry.date) === targetYear && entry.date <= monthEnd;
      });

      const paidAmount = sumAbsoluteAmounts(paidEntries);
      const committedAmount = appliesToMonth ? provision.amount : 0;
      const remainingAmount = Math.max(0, committedAmount - paidAmount);

      return {
        appliesToMonth,
        committedAmount,
        paidAmount,
        provision,
        remainingAmount,
      };
    });

  const recurringCommitted = recurringSnapshots.reduce(
    (total, item) => total + item.committedAmount,
    0,
  );
  const recurringPaid = recurringSnapshots.reduce(
    (total, item) => total + item.paidAmount,
    0,
  );
  const recurringRemaining = recurringSnapshots.reduce(
    (total, item) => total + item.remainingAmount,
    0,
  );

  const budgetProvisionCommitted = provisionSnapshots.reduce(
    (total, item) => total + item.committedAmount,
    0,
  );
  const budgetProvisionPaid = provisionSnapshots.reduce(
    (total, item) => total + item.paidAmount,
    0,
  );
  const budgetProvisionRemaining = provisionSnapshots.reduce(
    (total, item) => total + item.remainingAmount,
    0,
  );

  return {
    activeMonth: monthKey,
    budgetProvisionCommitted,
    budgetProvisionPaid,
    budgetProvisionRemaining,
    provisions: provisionSnapshots,
    recurringCommitted,
    recurringExpenses: recurringSnapshots,
    recurringPaid,
    recurringRemaining,
    totalCommitted: recurringCommitted + budgetProvisionCommitted,
    totalPaid: recurringPaid + budgetProvisionPaid,
    totalRemaining: recurringRemaining + budgetProvisionRemaining,
    walletId,
  };
}
