import { create } from "zustand";

import {
  calculateCommitmentOverview,
  type CommitmentOverview,
} from "@/modules/commitments/calculations";
import {
  listCommitmentPaymentEntries,
  listRecurringExpenses,
} from "@/modules/commitments/service";
import {
  createMockRecurringExpenses,
  type RecurringExpense,
} from "@/modules/commitments/types";
import type { LedgerEntry } from "@/modules/ledger/types";
import { listBudgetProvisions } from "@/modules/provisions/service";
import {
  createMockBudgetProvisions,
  type BudgetProvision,
} from "@/modules/provisions/types";

type RecalculateOverviewArgs = {
  month: string;
  walletId: string | null;
};

type RefreshCommitmentDataArgs = RecalculateOverviewArgs & {
  isDevBypass: boolean;
  userId: string;
};

type CommitmentStore = {
  addLocalBudgetProvision: (provision: BudgetProvision) => void;
  addLocalPaymentEntry: (entry: LedgerEntry, args: RecalculateOverviewArgs) => void;
  addLocalRecurringExpense: (expense: RecurringExpense) => void;
  budgetProvisions: BudgetProvision[];
  error: string | null;
  isLoading: boolean;
  isReady: boolean;
  overview: CommitmentOverview | null;
  paymentEntries: LedgerEntry[];
  recalculateOverview: (args: RecalculateOverviewArgs) => void;
  recurringExpenses: RecurringExpense[];
  refreshCommitmentData: (args: RefreshCommitmentDataArgs) => Promise<void>;
  reset: () => void;
};

const initialState = {
  budgetProvisions: [] as BudgetProvision[],
  error: null,
  isLoading: false,
  isReady: false,
  overview: null as CommitmentOverview | null,
  paymentEntries: [] as LedgerEntry[],
  recurringExpenses: [] as RecurringExpense[],
};

function buildOverview(args: {
  budgetProvisions: BudgetProvision[];
  month: string;
  paymentEntries: LedgerEntry[];
  recurringExpenses: RecurringExpense[];
  walletId: string | null;
}) {
  return calculateCommitmentOverview({
    budgetProvisions: args.budgetProvisions,
    month: args.month,
    paymentEntries: args.paymentEntries,
    recurringExpenses: args.recurringExpenses,
    walletId: args.walletId,
  });
}

function sortRecurringExpenses(expenses: RecurringExpense[]) {
  return [...expenses].sort((left, right) => {
    const leftWeight = `${left.billingMonth ?? 0}`.padStart(2, "0");
    const rightWeight = `${right.billingMonth ?? 0}`.padStart(2, "0");
    return `${leftWeight}-${left.billingDay}-${left.name}`.localeCompare(
      `${rightWeight}-${right.billingDay}-${right.name}`,
    );
  });
}

function sortBudgetProvisions(provisions: BudgetProvision[]) {
  return [...provisions].sort((left, right) => {
    const leftKey = `${left.month}-${left.createdAt}`;
    const rightKey = `${right.month}-${right.createdAt}`;
    return leftKey.localeCompare(rightKey);
  });
}

function sortPaymentEntries(entries: LedgerEntry[]) {
  return [...entries].sort((left, right) => {
    const leftKey = `${left.date}T${left.createdAt}`;
    const rightKey = `${right.date}T${right.createdAt}`;
    return rightKey.localeCompare(leftKey);
  });
}

export const useCommitmentStore = create<CommitmentStore>((set, get) => ({
  ...initialState,
  addLocalBudgetProvision: (provision) =>
    set((state) => ({
      budgetProvisions: sortBudgetProvisions([provision, ...state.budgetProvisions]),
    })),
  addLocalPaymentEntry: (entry, args) =>
    set((state) => {
      const paymentEntries = sortPaymentEntries([entry, ...state.paymentEntries]);

      return {
        overview: buildOverview({
          budgetProvisions: state.budgetProvisions,
          month: args.month,
          paymentEntries,
          recurringExpenses: state.recurringExpenses,
          walletId: args.walletId,
        }),
        paymentEntries,
      };
    }),
  addLocalRecurringExpense: (expense) =>
    set((state) => ({
      recurringExpenses: sortRecurringExpenses([expense, ...state.recurringExpenses]),
    })),
  recalculateOverview: ({ month, walletId }) =>
    set((state) => ({
      overview: buildOverview({
        budgetProvisions: state.budgetProvisions,
        month,
        paymentEntries: state.paymentEntries,
        recurringExpenses: state.recurringExpenses,
        walletId,
      }),
    })),
  refreshCommitmentData: async ({ isDevBypass, month, userId, walletId }) => {
    set({ error: null, isLoading: true });

    try {
      if (isDevBypass) {
        const currentState = get();
        const recurringExpenses =
          currentState.recurringExpenses.length > 0
            ? currentState.recurringExpenses
            : createMockRecurringExpenses(userId);
        const budgetProvisions =
          currentState.budgetProvisions.length > 0
            ? currentState.budgetProvisions
            : createMockBudgetProvisions(userId);
        const paymentEntries = currentState.paymentEntries;

        set({
          budgetProvisions,
          error: null,
          isLoading: false,
          isReady: true,
          overview: buildOverview({
            budgetProvisions,
            month,
            paymentEntries,
            recurringExpenses,
            walletId,
          }),
          paymentEntries,
          recurringExpenses,
        });
        return;
      }

      const [recurringExpenses, budgetProvisions, paymentEntries] =
        await Promise.all([
          listRecurringExpenses({ isDevBypass, userId }),
          listBudgetProvisions({ isDevBypass, userId }),
          listCommitmentPaymentEntries({ isDevBypass, month, userId, walletId }),
        ]);

      set({
        budgetProvisions: sortBudgetProvisions(budgetProvisions),
        error: null,
        isLoading: false,
        isReady: true,
        overview: buildOverview({
          budgetProvisions,
          month,
          paymentEntries,
          recurringExpenses,
          walletId,
        }),
        paymentEntries: sortPaymentEntries(paymentEntries),
        recurringExpenses: sortRecurringExpenses(recurringExpenses),
      });
    } catch (error) {
      set({
        budgetProvisions: [],
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los compromisos y provisiones.",
        isLoading: false,
        isReady: true,
        overview: null,
        paymentEntries: [],
        recurringExpenses: [],
      });
    }
  },
  reset: () => set(initialState),
}));
