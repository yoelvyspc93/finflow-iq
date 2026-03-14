import { create } from "zustand";

import { calculateSalaryOverview, type SalaryOverview } from "@/modules/salary/calculations";
import {
  listSalaryAllocations,
  listSalaryPayments,
  listSalaryPeriods,
} from "@/modules/salary/service";
import type {
  SalaryAllocation,
  SalaryPayment,
  SalaryPaymentStatus,
  SalaryPeriod,
  SalaryPeriodStatus,
} from "@/modules/salary/types";
import {
  createMockSalaryAllocations,
  createMockSalaryPayments,
  createMockSalaryPeriods,
} from "@/modules/salary/types";

type ApplyLocalSalaryPaymentArgs = {
  allocations: SalaryAllocation[];
  payment: SalaryPayment;
};

type RefreshSalaryDataArgs = {
  isDevBypass: boolean;
  userId: string;
};

type SalaryStore = {
  addLocalSalaryPeriod: (period: SalaryPeriod) => void;
  applyLocalSalaryPayment: (args: ApplyLocalSalaryPaymentArgs) => void;
  allocations: SalaryAllocation[];
  error: string | null;
  isLoading: boolean;
  isReady: boolean;
  overview: SalaryOverview | null;
  payments: SalaryPayment[];
  periods: SalaryPeriod[];
  refreshSalaryData: (args: RefreshSalaryDataArgs) => Promise<void>;
  reset: () => void;
};

const initialState = {
  allocations: [] as SalaryAllocation[],
  error: null,
  isLoading: false,
  isReady: false,
  overview: null as SalaryOverview | null,
  payments: [] as SalaryPayment[],
  periods: [] as SalaryPeriod[],
};

function buildOverview(periods: SalaryPeriod[], payments: SalaryPayment[]) {
  return calculateSalaryOverview(periods, payments);
}

function sortPeriods(periods: SalaryPeriod[]) {
  return [...periods].sort((left, right) =>
    right.periodMonth.localeCompare(left.periodMonth),
  );
}

function sortPayments(payments: SalaryPayment[]) {
  return [...payments].sort((left, right) => {
    const leftStamp = `${left.paymentDate}T${left.createdAt}`;
    const rightStamp = `${right.paymentDate}T${right.createdAt}`;
    return rightStamp.localeCompare(leftStamp);
  });
}

export const useSalaryStore = create<SalaryStore>((set) => ({
  ...initialState,
  addLocalSalaryPeriod: (period) =>
    set((state) => {
      const periods = sortPeriods([period, ...state.periods]);

      return {
        overview: buildOverview(periods, state.payments),
        periods,
      };
    }),
  applyLocalSalaryPayment: ({ allocations, payment }) =>
    set((state) => {
      const allocationTotals = allocations.reduce<Record<string, number>>(
        (totals, allocation) => {
          totals[allocation.salaryPeriodId] =
            (totals[allocation.salaryPeriodId] ?? 0) + allocation.amount;
          return totals;
        },
        {},
      );

      const periods = state.periods.map((period) => {
        const allocatedAmount = allocationTotals[period.id] ?? 0;

        if (!allocatedAmount) {
          return period;
        }

        const coveredAmount = Math.min(
          period.coveredAmount + allocatedAmount,
          period.expectedAmount,
        );
        const status: SalaryPeriodStatus =
          coveredAmount === 0
            ? "pending"
            : coveredAmount < period.expectedAmount
              ? "partial"
              : "covered";

        return {
          ...period,
          coveredAmount,
          status,
          updatedAt: new Date().toISOString(),
        };
      });

      const allocatedAmount = allocations.reduce(
        (total, allocation) => total + allocation.amount,
        0,
      );
      const paymentStatus: SalaryPaymentStatus =
        allocatedAmount === 0
          ? "unallocated"
          : allocatedAmount < payment.grossAmount
            ? "partial"
            : "allocated";

      const payments = sortPayments([
        {
          ...payment,
          allocatedAmount,
          status: paymentStatus,
          updatedAt: new Date().toISOString(),
        },
        ...state.payments,
      ]);

      const nextAllocations = [...allocations, ...state.allocations];

      return {
        allocations: nextAllocations,
        overview: buildOverview(periods, payments),
        payments,
        periods,
      };
    }),
  refreshSalaryData: async ({ isDevBypass, userId }) => {
    set({ error: null, isLoading: true });

    try {
      if (isDevBypass) {
        const existingState = useSalaryStore.getState();
        const periods =
          existingState.periods.length > 0
            ? existingState.periods
            : createMockSalaryPeriods(userId);
        const payments =
          existingState.payments.length > 0
            ? existingState.payments
            : createMockSalaryPayments(userId);
        const allocations =
          existingState.allocations.length > 0
            ? existingState.allocations
            : createMockSalaryAllocations(userId);

        set({
          allocations,
          error: null,
          isLoading: false,
          isReady: true,
          overview: buildOverview(periods, payments),
          payments,
          periods,
        });
        return;
      }

      const [periods, payments, allocations] = await Promise.all([
        listSalaryPeriods({ isDevBypass, userId }),
        listSalaryPayments({ isDevBypass, userId }),
        listSalaryAllocations({ isDevBypass, userId }),
      ]);

      set({
        allocations,
        error: null,
        isLoading: false,
        isReady: true,
        overview: buildOverview(periods, payments),
        payments: sortPayments(payments),
        periods: sortPeriods(periods),
      });
    } catch (error) {
      set({
        allocations: [],
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos salariales.",
        isLoading: false,
        isReady: true,
        overview: null,
        payments: [],
        periods: [],
      });
    }
  },
  reset: () => set(initialState),
}));
