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
  SalaryPeriod,
} from "@/modules/salary/types";

type RefreshSalaryDataArgs = {
  userId: string;
};

type SalaryStore = {
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
  refreshSalaryData: async ({ userId }) => {
    set({ error: null, isLoading: true });

    try {
      const [periods, payments, allocations] = await Promise.all([
        listSalaryPeriods({ userId }),
        listSalaryPayments({ userId }),
        listSalaryAllocations({ userId }),
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
