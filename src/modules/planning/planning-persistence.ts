import { getCurrentWeekStart, type FinancialScore, type FinancialScoreBreakdown, upsertFinancialScore } from '@/modules/insights/score'
import type { PlanningEvaluationResult } from '@/modules/planning/orchestrator'
import { syncWishProjections } from '@/modules/wishes/service'

export type PlanningPersistenceDependencies = {
  getCurrentWeekStart: typeof getCurrentWeekStart
  syncWishProjections: typeof syncWishProjections
  upsertFinancialScore: typeof upsertFinancialScore
}

export async function persistPlanningSideEffects(args: {
  dependencies: PlanningPersistenceDependencies
  evaluation: PlanningEvaluationResult
  isDevBypass: boolean
  nowIso?: string
  userId: string
}): Promise<FinancialScore | null> {
  const { dependencies, evaluation, isDevBypass, userId } = args

  if (isDevBypass) {
    const createdAt = args.nowIso ?? new Date().toISOString()
    const breakdown: FinancialScoreBreakdown = evaluation.currentScorePayload.breakdown

    return {
      aiTip: null,
      breakdown,
      createdAt,
      id: 'dev-financial-score-current',
      score: breakdown.total_score,
      userId,
      weekStart: dependencies.getCurrentWeekStart(createdAt.slice(0, 10)),
    }
  }

  const currentScore = await dependencies.upsertFinancialScore({
    breakdown: evaluation.currentScorePayload.breakdown,
    userId,
    weekStart: dependencies.getCurrentWeekStart(),
  })

  await dependencies.syncWishProjections(evaluation.wishProjectionSyncInputs)

  return currentScore
}
