import { supabase } from "@/lib/supabase/client";
import type { GoalContribution } from "@/modules/goals/types";
import type { WishProjection } from "@/modules/wishes/calculations";
import type { Tables } from "@/types/supabase";

export type FinancialScoreRow = Tables<"financial_scores">;

export type FinancialScoreBreakdown = {
  commitment_score: number;
  liquidity_score: number;
  salary_stability_score: number;
  savings_score: number;
  total_score: number;
  wishlist_pressure_score: number;
};

export type FinancialScore = {
  aiTip: string | null;
  breakdown: FinancialScoreBreakdown;
  createdAt: string;
  id: string;
  score: number;
  userId: string;
  weekStart: string;
};

export type FinancialScoreInput = {
  assignableAmount: number;
  availableBalance: number;
  committedAmount: number;
  goalContributions: GoalContribution[];
  monthlyCommitmentAverage: number;
  monthlyIncome: number;
  monthsWithoutPayment: number;
  pendingSalaryAmount: number;
  savingsGoalPercent: number;
  wishProjections: WishProjection[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function averageGoalContributionsPerMonth(contributions: GoalContribution[]) {
  if (contributions.length === 0) {
    return 0;
  }

  const ordered = [...contributions].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const first = new Date(`${ordered[0].date}T00:00:00.000Z`);
  const last = new Date(`${ordered[ordered.length - 1].date}T00:00:00.000Z`);
  const monthSpan = Math.max(
    1,
    (last.getUTCFullYear() - first.getUTCFullYear()) * 12 +
      (last.getUTCMonth() - first.getUTCMonth()) +
      1,
  );

  return (
    contributions.reduce((total, contribution) => total + contribution.amount, 0) /
    monthSpan
  );
}

export function calculateSalaryStabilityScore(args: {
  monthlyIncome: number;
  monthsWithoutPayment: number;
  pendingSalaryAmount: number;
}) {
  if (args.monthlyIncome <= 0 && args.pendingSalaryAmount <= 0) {
    return 60;
  }

  const pendingRatio =
    args.monthlyIncome > 0
      ? clamp(args.pendingSalaryAmount / args.monthlyIncome, 0, 1)
      : 1;

  return Math.round(
    clamp(100 - args.monthsWithoutPayment * 18 - pendingRatio * 25, 20, 100),
  );
}

export function calculateFinancialScore(
  input: FinancialScoreInput,
): FinancialScoreBreakdown {
  const freeBalance = Math.max(input.availableBalance - input.committedAmount, 0);
  const liquidityCoverageMonths =
    input.monthlyCommitmentAverage > 0
      ? freeBalance / input.monthlyCommitmentAverage
      : 3;
  const commitmentRatio =
    input.availableBalance > 0
      ? clamp(input.committedAmount / input.availableBalance, 0, 1)
      : 1;
  const targetMonthlySavings =
    input.monthlyIncome > 0
      ? input.monthlyIncome * (input.savingsGoalPercent / 100)
      : 0;
  const actualMonthlySavings = averageGoalContributionsPerMonth(
    input.goalContributions,
  );
  const topWishPressure = input.wishProjections
    .filter((projection) => !projection.wish.isPurchased)
    .slice(0, 3)
    .reduce((total, projection) => total + projection.wish.estimatedAmount, 0);
  const liquidityScore = Math.round(
    clamp((liquidityCoverageMonths / 3) * 100, 0, 100),
  );
  const commitmentScore = Math.round((1 - commitmentRatio) * 100);
  const savingsScore =
    targetMonthlySavings > 0
      ? Math.round(
          clamp(actualMonthlySavings / targetMonthlySavings, 0, 1) * 100,
        )
      : actualMonthlySavings > 0
        ? 80
        : 55;
  const salaryStabilityScore = calculateSalaryStabilityScore({
    monthlyIncome: input.monthlyIncome,
    monthsWithoutPayment: input.monthsWithoutPayment,
    pendingSalaryAmount: input.pendingSalaryAmount,
  });
  const wishlistCoverage =
    topWishPressure > 0
      ? clamp(
          (Math.max(input.assignableAmount, 0) + actualMonthlySavings * 6) /
            topWishPressure,
          0,
          1,
        )
      : 1;
  const wishlistPressureScore = Math.round(wishlistCoverage * 100);
  const totalScore = Math.round(
    liquidityScore * 0.3 +
      commitmentScore * 0.2 +
      savingsScore * 0.2 +
      salaryStabilityScore * 0.15 +
      wishlistPressureScore * 0.15,
  );

  return {
    commitment_score: commitmentScore,
    liquidity_score: liquidityScore,
    salary_stability_score: salaryStabilityScore,
    savings_score: savingsScore,
    total_score: totalScore,
    wishlist_pressure_score: wishlistPressureScore,
  };
}

export function getCurrentWeekStart(referenceDate?: string) {
  const base = referenceDate
    ? new Date(`${referenceDate}T00:00:00.000Z`)
    : new Date();
  const day = base.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setUTCDate(base.getUTCDate() + diff);
  return base.toISOString().slice(0, 10);
}

export function mapFinancialScore(row: FinancialScoreRow): FinancialScore {
  const breakdown = row.breakdown as unknown as Partial<FinancialScoreBreakdown>;

  return {
    aiTip: row.ai_tip,
    breakdown: {
      commitment_score: breakdown.commitment_score ?? 0,
      liquidity_score: breakdown.liquidity_score ?? 0,
      salary_stability_score: breakdown.salary_stability_score ?? 0,
      savings_score: breakdown.savings_score ?? 0,
      total_score: breakdown.total_score ?? row.score,
      wishlist_pressure_score: breakdown.wishlist_pressure_score ?? 0,
    },
    createdAt: row.created_at,
    id: row.id,
    score: row.score,
    userId: row.user_id,
    weekStart: row.week_start,
  };
}

export async function listFinancialScores(args: {
  isDevBypass: boolean;
  userId: string;
}) {
  if (args.isDevBypass) {
    return [] as FinancialScore[];
  }

  const { data, error } = await supabase
    .from("financial_scores")
    .select("*")
    .eq("user_id", args.userId)
    .order("week_start", { ascending: false })
    .limit(8);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapFinancialScore);
}

export async function upsertFinancialScore(input: {
  breakdown: FinancialScoreBreakdown;
  userId: string;
  weekStart: string;
}) {
  const { data, error } = await supabase
    .from("financial_scores")
    .upsert(
      {
        breakdown: input.breakdown,
        score: input.breakdown.total_score,
        user_id: input.userId,
        week_start: input.weekStart,
      },
      { onConflict: "user_id,week_start" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapFinancialScore(data);
}
