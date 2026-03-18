import { create } from "zustand";

import {
  listRecurringExpenses,
  listCommitmentPaymentEntries,
} from "@/modules/commitments/service";
import {
  type GoalProgressSnapshot,
} from "@/modules/goals/calculations";
import {
  listGoalContributions,
  listGoals,
} from "@/modules/goals/service";
import {
  createMockGoalContributions,
  createMockGoals,
  type Goal,
  type GoalContribution,
} from "@/modules/goals/types";
import {
  getCurrentWeekStart,
  listFinancialScores,
  upsertFinancialScore,
  type FinancialScore,
} from "@/modules/insights/score";
import {
  evaluatePlanningState,
  mergePlanningScores,
  type PlanningOverview,
} from "@/modules/planning/orchestrator";
import { listBudgetProvisions } from "@/modules/provisions/service";
import {
  listSalaryPayments,
  listSalaryPeriods,
} from "@/modules/salary/service";
import type { AppSettings } from "@/modules/settings/types";
import type { Wallet } from "@/modules/wallets/types";
import {
  type WishProjection,
} from "@/modules/wishes/calculations";
import {
  listWishes,
  syncWishProjections,
} from "@/modules/wishes/service";
import { createMockWishes, type Wish } from "@/modules/wishes/types";

type RefreshPlanningDataArgs = {
  isDevBypass: boolean;
  settings: AppSettings | null;
  userId: string;
  wallets: Wallet[];
};

type PlanningStore = {
  addLocalGoal: (goal: Goal) => void;
  addLocalGoalContribution: (contribution: GoalContribution) => void;
  addLocalWish: (wish: Wish) => void;
  currentScore: FinancialScore | null;
  error: string | null;
  goalContributions: GoalContribution[];
  goalSnapshots: GoalProgressSnapshot[];
  goals: Goal[];
  isLoading: boolean;
  isReady: boolean;
  overview: PlanningOverview | null;
  recentScores: FinancialScore[];
  refreshPlanningData: (args: RefreshPlanningDataArgs) => Promise<void>;
  reset: () => void;
  wishProjections: WishProjection[];
  wishes: Wish[];
};

const initialState = {
  currentScore: null as FinancialScore | null,
  error: null,
  goalContributions: [] as GoalContribution[],
  goalSnapshots: [] as GoalProgressSnapshot[],
  goals: [] as Goal[],
  isLoading: false,
  isReady: false,
  overview: null as PlanningOverview | null,
  recentScores: [] as FinancialScore[],
  wishProjections: [] as WishProjection[],
  wishes: [] as Wish[],
};

export const usePlanningStore = create<PlanningStore>((set) => ({
  ...initialState,
  addLocalGoal: (goal) =>
    set((state) => ({
      goals: [...state.goals, goal],
    })),
  addLocalGoalContribution: (contribution) =>
    set((state) => ({
      goalContributions: [contribution, ...state.goalContributions],
    })),
  addLocalWish: (wish) =>
    set((state) => ({
      wishes: [...state.wishes, wish].sort((left, right) => left.priority - right.priority),
    })),
  refreshPlanningData: async ({ isDevBypass, settings, userId, wallets }) => {
    set({ error: null, isLoading: true });

    try {
      const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;
      const [
        salaryPeriods,
        salaryPayments,
        recurringExpenses,
        budgetProvisions,
        paymentEntries,
        recentScores,
      ] = await Promise.all([
        listSalaryPeriods({ isDevBypass, userId }),
        listSalaryPayments({ isDevBypass, userId }),
        listRecurringExpenses({ isDevBypass, userId }),
        listBudgetProvisions({ isDevBypass, userId }),
        listCommitmentPaymentEntries({ isDevBypass, month: currentMonth, userId }),
        listFinancialScores({ isDevBypass, userId }),
      ]);

      const existingState = usePlanningStore.getState();
      const goals =
        isDevBypass && existingState.goals.length > 0
          ? existingState.goals
          : await listGoals({ isDevBypass, userId });
      const goalContributions =
        isDevBypass && existingState.goalContributions.length > 0
          ? existingState.goalContributions
          : await listGoalContributions({ isDevBypass, userId });
      const wishes =
        isDevBypass && existingState.wishes.length > 0
          ? existingState.wishes
          : await listWishes({ isDevBypass, userId });

      const resolvedGoals =
        isDevBypass && goals.length === 0 ? createMockGoals(userId) : goals;
      const resolvedContributions =
        isDevBypass && goalContributions.length === 0
          ? createMockGoalContributions(userId)
          : goalContributions;
      const resolvedWishes =
        isDevBypass && wishes.length === 0 ? createMockWishes(userId) : wishes;
      const evaluation = evaluatePlanningState({
        budgetProvisions,
        currentMonth,
        goalContributions: resolvedContributions,
        goals: resolvedGoals,
        paymentEntries,
        recentScores,
        recurringExpenses,
        salaryPayments,
        salaryPeriods,
        settings,
        userId,
        wallets,
        wishes: resolvedWishes,
      });
      const currentScore = isDevBypass
        ? {
            aiTip: null,
            breakdown: evaluation.currentScorePayload.breakdown,
            createdAt: new Date().toISOString(),
            id: "dev-financial-score-current",
            score: evaluation.currentScorePayload.breakdown.total_score,
            userId,
            weekStart: getCurrentWeekStart(),
          }
        : await upsertFinancialScore({
            breakdown: evaluation.currentScorePayload.breakdown,
            userId,
            weekStart: getCurrentWeekStart(),
          });

      if (!isDevBypass) {
        await syncWishProjections(evaluation.wishProjectionSyncInputs);
      }

      set({
        currentScore,
        error: null,
        goalContributions: resolvedContributions,
        goalSnapshots: evaluation.goalSnapshots,
        goals: resolvedGoals,
        isLoading: false,
        isReady: true,
        overview: evaluation.overview,
        recentScores: mergePlanningScores(currentScore, recentScores),
        wishProjections: evaluation.wishProjections,
        wishes: resolvedWishes,
      });
    } catch (error) {
      set({
        currentScore: null,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la planificacion.",
        goalContributions: [],
        goalSnapshots: [],
        goals: [],
        isLoading: false,
        isReady: true,
        overview: null,
        recentScores: [],
        wishProjections: [],
        wishes: [],
      });
    }
  },
  reset: () => set(initialState),
}));
