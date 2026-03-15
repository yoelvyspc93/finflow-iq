import { create } from "zustand";

import { calculateCommitmentOverview } from "@/modules/commitments/calculations";
import {
  listCommitmentPaymentEntries,
  listRecurringExpenses,
} from "@/modules/commitments/service";
import {
  calculateAverageGoalContributionPerMonth,
  calculateGoalSnapshots,
  type GoalProgressSnapshot,
} from "@/modules/goals/calculations";
import {
  listGoalContributions,
  listGoals,
} from "@/modules/goals/service";
import type { Goal, GoalContribution } from "@/modules/goals/types";
import {
  calculateFinancialScore,
  calculateSalaryStabilityScore,
  getCurrentWeekStart,
  listFinancialScores,
  upsertFinancialScore,
  type FinancialScore,
} from "@/modules/insights/score";
import { listBudgetProvisions } from "@/modules/provisions/service";
import { calculateSalaryOverview } from "@/modules/salary/calculations";
import {
  listSalaryPayments,
  listSalaryPeriods,
} from "@/modules/salary/service";
import type { AppSettings } from "@/modules/settings/types";
import type { Wallet } from "@/modules/wallets/types";
import {
  calculateWishProjections,
  type WishProjection,
} from "@/modules/wishes/calculations";
import {
  listWishes,
  syncWishProjections,
} from "@/modules/wishes/service";
import type { Wish } from "@/modules/wishes/types";

type PlanningOverview = {
  assignableAmount: number;
  availableBalance: number;
  committedAmount: number;
  monthlyCommitmentAverage: number;
  monthlyGoalContributionAverage: number;
  monthlyIncome: number;
  pendingSalaryAmount: number;
  reserveAmount: number;
  totalGoalSaved: number;
  totalGoalTarget: number;
  totalWishEstimated: number;
};

type RefreshPlanningDataArgs = {
  isDevBypass: boolean;
  settings: AppSettings | null;
  userId: string;
  wallets: Wallet[];
};

type PlanningStore = {
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

function averageMonthlyCommitments(recurringExpenses: {
  amount: number;
  frequency: string;
  isActive: boolean;
}[]) {
  return recurringExpenses.reduce((total, expense) => {
    if (!expense.isActive) {
      return total;
    }

    return total + (expense.frequency === "yearly" ? expense.amount / 12 : expense.amount);
  }, 0);
}

function averageMonthlyIncome(args: {
  fallback: number | null;
  payments: { grossAmount: number; paymentDate: string }[];
}) {
  if (args.fallback && args.fallback > 0) {
    return args.fallback;
  }

  if (args.payments.length === 0) {
    return 0;
  }

  const recentPayments = [...args.payments]
    .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate))
    .slice(0, 6);

  return (
    recentPayments.reduce((total, payment) => total + payment.grossAmount, 0) /
    recentPayments.length
  );
}

function buildOverview(args: {
  availableBalance: number;
  committedAmount: number;
  goalContributions: GoalContribution[];
  goalSnapshots: GoalProgressSnapshot[];
  monthlyCommitmentAverage: number;
  monthlyIncome: number;
  pendingSalaryAmount: number;
  reserveAmount: number;
  wishProjections: WishProjection[];
}) {
  return {
    assignableAmount:
      args.availableBalance - args.committedAmount - args.reserveAmount,
    availableBalance: args.availableBalance,
    committedAmount: args.committedAmount,
    monthlyCommitmentAverage: args.monthlyCommitmentAverage,
    monthlyGoalContributionAverage: calculateAverageGoalContributionPerMonth(
      args.goalContributions,
    ),
    monthlyIncome: args.monthlyIncome,
    pendingSalaryAmount: args.pendingSalaryAmount,
    reserveAmount: args.reserveAmount,
    totalGoalSaved: args.goalSnapshots.reduce(
      (total, snapshot) => total + snapshot.contributedAmount,
      0,
    ),
    totalGoalTarget: args.goalSnapshots.reduce(
      (total, snapshot) => total + snapshot.goal.targetAmount,
      0,
    ),
    totalWishEstimated: args.wishProjections
      .filter((projection) => !projection.wish.isPurchased)
      .reduce((total, projection) => total + projection.wish.estimatedAmount, 0),
  };
}

function mergeScores(
  currentScore: FinancialScore | null,
  remoteScores: FinancialScore[],
) {
  const byWeek = new Map<string, FinancialScore>();

  for (const score of remoteScores) {
    byWeek.set(score.weekStart, score);
  }

  if (currentScore) {
    byWeek.set(currentScore.weekStart, currentScore);
  }

  return [...byWeek.values()].sort((left, right) =>
    right.weekStart.localeCompare(left.weekStart),
  );
}

export const usePlanningStore = create<PlanningStore>((set) => ({
  ...initialState,
  refreshPlanningData: async ({ isDevBypass, settings, userId, wallets }) => {
    set({ error: null, isLoading: true });

    try {
      const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;
      const [
        goals,
        goalContributions,
        wishes,
        salaryPeriods,
        salaryPayments,
        recurringExpenses,
        budgetProvisions,
        paymentEntries,
        recentScores,
      ] = await Promise.all([
        listGoals({ isDevBypass, userId }),
        listGoalContributions({ isDevBypass, userId }),
        listWishes({ isDevBypass, userId }),
        listSalaryPeriods({ isDevBypass, userId }),
        listSalaryPayments({ isDevBypass, userId }),
        listRecurringExpenses({ isDevBypass, userId }),
        listBudgetProvisions({ isDevBypass, userId }),
        listCommitmentPaymentEntries({ isDevBypass, month: currentMonth, userId }),
        listFinancialScores({ isDevBypass, userId }),
      ]);

      const goalSnapshots = calculateGoalSnapshots({
        contributions: goalContributions,
        goals,
      });
      const salaryOverview = calculateSalaryOverview(
        salaryPeriods,
        salaryPayments,
      );
      const commitmentOverview = calculateCommitmentOverview({
        budgetProvisions,
        month: currentMonth,
        paymentEntries,
        recurringExpenses,
        walletId: null,
      });
      const availableBalance = wallets.reduce(
        (total, wallet) => total + (wallet.isActive ? wallet.balance : 0),
        0,
      );
      const monthlyCommitmentAverage = averageMonthlyCommitments(recurringExpenses);
      const monthlyIncome = averageMonthlyIncome({
        fallback: settings?.salaryReferenceAmount ?? null,
        payments: salaryPayments,
      });
      const reserveAmount =
        (settings?.avgMonthsWithoutPayment ?? 0) *
        monthlyCommitmentAverage *
        (1 + (settings?.savingsGoalPercent ?? 0) / 100);
      const assignableAmount =
        availableBalance - commitmentOverview.totalRemaining - reserveAmount;
      const salaryStabilityScore = calculateSalaryStabilityScore({
        monthlyIncome,
        monthsWithoutPayment: salaryOverview.monthsWithoutPayment,
        pendingSalaryAmount: salaryOverview.pendingTotal,
      });
      const monthlySavingCapacity = Math.max(
        monthlyIncome * ((settings?.savingsGoalPercent ?? 0) / 100),
        calculateAverageGoalContributionPerMonth(goalContributions),
      );
      const wishProjections = calculateWishProjections({
        assignableAmount,
        monthlySavingCapacity,
        salaryStabilityScore,
        wishes,
      });
      const breakdown = calculateFinancialScore({
        assignableAmount,
        availableBalance,
        committedAmount: commitmentOverview.totalRemaining,
        goalContributions,
        monthlyCommitmentAverage,
        monthlyIncome,
        monthsWithoutPayment: salaryOverview.monthsWithoutPayment,
        pendingSalaryAmount: salaryOverview.pendingTotal,
        savingsGoalPercent: settings?.savingsGoalPercent ?? 0,
        wishProjections,
      });
      const currentScore = isDevBypass
        ? {
            aiTip: null,
            breakdown,
            createdAt: new Date().toISOString(),
            id: "dev-financial-score-current",
            score: breakdown.total_score,
            userId,
            weekStart: getCurrentWeekStart(),
          }
        : await upsertFinancialScore({
            breakdown,
            userId,
            weekStart: getCurrentWeekStart(),
          });

      if (!isDevBypass) {
        await syncWishProjections(
          wishProjections.map((projection) => ({
            confidenceLevel: projection.confidenceLevel,
            confidenceReason: projection.confidenceReason,
            estimatedPurchaseDate: projection.estimatedPurchaseDate,
            lastCalculatedAt: new Date().toISOString(),
            wishId: projection.wish.id,
          })),
        );
      }

      set({
        currentScore,
        error: null,
        goalContributions,
        goalSnapshots,
        goals,
        isLoading: false,
        isReady: true,
        overview: buildOverview({
          availableBalance,
          committedAmount: commitmentOverview.totalRemaining,
          goalContributions,
          goalSnapshots,
          monthlyCommitmentAverage,
          monthlyIncome,
          pendingSalaryAmount: salaryOverview.pendingTotal,
          reserveAmount,
          wishProjections,
        }),
        recentScores: mergeScores(currentScore, recentScores),
        wishProjections,
        wishes,
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
