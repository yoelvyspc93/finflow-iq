import { getCurrentWeekStart, type FinancialScore, upsertFinancialScore } from '@/modules/insights/score'
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
  userId: string
}): Promise<FinancialScore | null> {
  const { dependencies, evaluation, userId } = args

  const currentScore = await dependencies.upsertFinancialScore({
    breakdown: evaluation.currentScorePayload.breakdown,
    userId,
    weekStart: dependencies.getCurrentWeekStart(),
  })

  await dependencies.syncWishProjections(evaluation.wishProjectionSyncInputs)

  return currentScore
}
