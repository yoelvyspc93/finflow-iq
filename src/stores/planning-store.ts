import { create } from "zustand";

import {
  type GoalProgressSnapshot,
} from "@/modules/goals/calculations";
import {
  type Goal,
  type GoalContribution,
} from "@/modules/goals/types";
import {
  type FinancialScore,
} from "@/modules/insights/score";
import { planningRefreshService } from "@/modules/planning/planning-refresh-service";
import type { PlanningOverview } from "@/modules/planning/orchestrator";
import type { AppSettings } from "@/modules/settings/types";
import type { Wallet } from "@/modules/wallets/types";
import {
  type WishProjection,
} from "@/modules/wishes/calculations";
import { type Wish } from "@/modules/wishes/types";

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
      const existingState = usePlanningStore.getState();
      const result = await planningRefreshService.refresh({
        existingState: {
          goalContributions: existingState.goalContributions,
          goals: existingState.goals,
          wishes: existingState.wishes,
        },
        refreshArgs: {
          isDevBypass,
          settings,
          userId,
          wallets,
        },
      });

      set({
        currentScore: result.currentScore,
        error: null,
        goalContributions: result.goalContributions,
        goalSnapshots: result.goalSnapshots,
        goals: result.goals,
        isLoading: false,
        isReady: true,
        overview: result.overview,
        recentScores: result.recentScores,
        wishProjections: result.wishProjections,
        wishes: result.wishes,
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
