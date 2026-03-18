import type { Json } from "@/types/supabase";

import type { FinancialScoreBreakdown } from "@/modules/insights/score-core";

type JsonRecord = Record<string, Json | undefined>;

function isJsonRecord(value: Json): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(record: JsonRecord, key: keyof FinancialScoreBreakdown) {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

export function parseFinancialScoreBreakdown(
  breakdown: Json,
  fallbackScore: number,
): FinancialScoreBreakdown {
  const record = isJsonRecord(breakdown) ? breakdown : {};

  return {
    commitment_score: readNumber(record, "commitment_score") ?? 0,
    liquidity_score: readNumber(record, "liquidity_score") ?? 0,
    salary_stability_score: readNumber(record, "salary_stability_score") ?? 0,
    savings_score: readNumber(record, "savings_score") ?? 0,
    total_score: readNumber(record, "total_score") ?? fallbackScore,
    wishlist_pressure_score: readNumber(record, "wishlist_pressure_score") ?? 0,
  };
}

