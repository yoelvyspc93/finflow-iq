import { supabase } from "@/lib/supabase/client";
import { parseFinancialScoreBreakdown } from "@/modules/insights/score-breakdown";
import {
  calculateFinancialScore,
  calculateSalaryStabilityScore,
  getCurrentWeekStart,
  type FinancialScoreBreakdown,
  type FinancialScoreInput,
} from "@/modules/insights/score-core";
import type { Tables } from "@/types/supabase";

export type FinancialScoreRow = Tables<"financial_scores">;

export type FinancialScore = {
  aiTip: string | null;
  breakdown: FinancialScoreBreakdown;
  createdAt: string;
  id: string;
  score: number;
  userId: string;
  weekStart: string;
};

export function mapFinancialScore(row: FinancialScoreRow): FinancialScore {
  return {
    aiTip: row.ai_tip,
    breakdown: parseFinancialScoreBreakdown(row.breakdown, row.score),
    createdAt: row.created_at,
    id: row.id,
    score: row.score,
    userId: row.user_id,
    weekStart: row.week_start,
  };
}

export async function listFinancialScores(args: {
  userId: string;
}) {
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

export {
  calculateFinancialScore,
  calculateSalaryStabilityScore,
  getCurrentWeekStart,
};
export type { FinancialScoreBreakdown, FinancialScoreInput };
