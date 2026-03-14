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
  isDevBypass: boolean;
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

export const useSalaryStore = create<SalaryStore>((set) => ({
  ...initialState,
  refreshSalaryData: async ({ isDevBypass, userId }) => {
    set({ error: null, isLoading: true });

    try {
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
        overview: calculateSalaryOverview(periods, payments),
        payments,
        periods,
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
