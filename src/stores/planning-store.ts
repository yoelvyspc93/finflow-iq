import { create } from "zustand";

import type { DashboardHealthOutput } from "@/modules/ai/types";
import {
  type FinancialScore,
  mapFinancialScore,
} from "@/modules/insights/score";
import { supabase } from "@/lib/supabase/client";
import { mergePlanningScores } from "@/modules/planning/orchestrator";
import { planningRefreshService } from "@/modules/planning/planning-refresh-service";
import type { PlanningOverview } from "@/modules/planning/orchestrator";
import type { AppSettings } from "@/modules/settings/types";
import type { Wallet } from "@/modules/wallets/types";
import {
  type WishProjection,
} from "@/modules/wishes/calculations";
import { mapWish, type Wish } from "@/modules/wishes/types";
import type { Tables } from "@/types/supabase";

type RefreshPlanningDataArgs = {
  settings: AppSettings | null;
  userId: string;
  wallets: Wallet[];
};

type PlanningStore = {
  currentScore: FinancialScore | null;
  dashboardHealth: DashboardHealthOutput | null;
  error: string | null;
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
  dashboardHealth: null as DashboardHealthOutput | null,
  error: null,
  isLoading: false,
  isReady: false,
  overview: null as PlanningOverview | null,
  recentScores: [] as FinancialScore[],
  wishProjections: [] as WishProjection[],
  wishes: [] as Wish[],
};

let planningAiChannel: ReturnType<typeof supabase.channel> | null = null;
let subscribedPlanningUserId: string | null = null;

function patchWishProjectionCollections(args: {
  nextWish: Wish;
  wishProjections: WishProjection[];
  wishes: Wish[];
}) {
  const wishExists = args.wishes.some((wish) => wish.id === args.nextWish.id);
  const nextWishes = wishExists
    ? args.wishes.map((wish) => (wish.id === args.nextWish.id ? args.nextWish : wish))
    : [...args.wishes, args.nextWish];

  return {
    wishProjections: args.wishProjections.map((projection) =>
      projection.wish.id === args.nextWish.id
        ? { ...projection, wish: args.nextWish }
        : projection,
    ),
    wishes: nextWishes,
  };
}

function teardownPlanningAiSubscription() {
  if (!planningAiChannel) {
    return;
  }

  void planningAiChannel.unsubscribe();
  planningAiChannel = null;
  subscribedPlanningUserId = null;
}

function ensurePlanningAiSubscription(userId: string) {
  if (planningAiChannel && subscribedPlanningUserId === userId) {
    return;
  }

  teardownPlanningAiSubscription();

  planningAiChannel = supabase
    .channel(`planning-ai-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `user_id=eq.${userId}`,
        schema: "public",
        table: "financial_scores",
      },
      (payload) => {
        if (!payload.new) {
          return;
        }

        const score = mapFinancialScore(payload.new as Tables<"financial_scores">);

        usePlanningStore.setState((state) => ({
          currentScore:
            state.currentScore?.id === score.id ||
            state.currentScore?.weekStart === score.weekStart
              ? score
              : state.currentScore,
          recentScores: mergePlanningScores(score, state.recentScores).slice(0, 8),
        }));
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `user_id=eq.${userId}`,
        schema: "public",
        table: "wishes",
      },
      (payload) => {
        if (!payload.new) {
          return;
        }

        const wish = mapWish(payload.new as Tables<"wishes">);

        usePlanningStore.setState((state) => {
          const nextCollections = patchWishProjectionCollections({
            nextWish: wish,
            wishProjections: state.wishProjections,
            wishes: state.wishes,
          });

          return nextCollections;
        });
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `user_id=eq.${userId}`,
        schema: "public",
        table: "ai_insights",
      },
      (payload) => {
        if (!payload.new) {
          return;
        }

        const row = payload.new as Tables<"ai_insights">;

        if (
          row.scope !== "dashboard_health" ||
          (row.status !== "completed" && row.status !== "fallback") ||
          !row.output_json
        ) {
          return;
        }

        usePlanningStore.setState({
          dashboardHealth: row.output_json as DashboardHealthOutput,
        });
      },
    )
    .subscribe();

  subscribedPlanningUserId = userId;
}

export const usePlanningStore = create<PlanningStore>((set) => ({
  ...initialState,
  refreshPlanningData: async ({ settings, userId, wallets }) => {
    set({ error: null, isLoading: true });

    try {
      const existingState = usePlanningStore.getState();
      const result = await planningRefreshService.refresh({
        existingState: {
          wishes: existingState.wishes,
        },
        refreshArgs: {
          settings,
          userId,
          wallets,
        },
      });

      set({
        currentScore: result.currentScore,
        dashboardHealth: result.dashboardHealth,
        error: null,
        isLoading: false,
        isReady: true,
        overview: result.overview,
        recentScores: result.recentScores,
        wishProjections: result.wishProjections,
        wishes: result.wishes,
      });
      ensurePlanningAiSubscription(userId);
    } catch (error) {
      teardownPlanningAiSubscription();
      set({
        currentScore: null,
        dashboardHealth: null,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la planificación.",
        isLoading: false,
        isReady: true,
        overview: null,
        recentScores: [],
        wishProjections: [],
        wishes: [],
      });
    }
  },
  reset: () => {
    teardownPlanningAiSubscription();
    set(initialState);
  },
}));
