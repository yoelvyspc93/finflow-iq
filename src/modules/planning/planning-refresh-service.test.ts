import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryPlanningData = vi.fn()
const resolvePlanningData = vi.fn()
const evaluatePlanningState = vi.fn()
const persistPlanningSideEffects = vi.fn()
const mergePlanningScores = vi.fn()
const getCurrentWeekStart = vi.fn()

vi.mock('@/modules/planning/planning-query', () => ({
  queryPlanningData,
}))
vi.mock('@/modules/planning/planning-resolution', () => ({
  resolvePlanningData,
}))
vi.mock('@/modules/planning/orchestrator', () => ({
  evaluatePlanningState,
  mergePlanningScores,
}))
vi.mock('@/modules/planning/planning-persistence', () => ({
  persistPlanningSideEffects,
}))
vi.mock('@/modules/insights/score', () => ({
  getCurrentWeekStart,
  listFinancialScores: vi.fn(),
  upsertFinancialScore: vi.fn(),
}))
vi.mock('@/modules/commitments/service', () => ({
  listCommitmentPaymentEntries: vi.fn(),
  listRecurringExpenses: vi.fn(),
}))
vi.mock('@/modules/goals/service', () => ({
  listGoalContributions: vi.fn(),
  listGoals: vi.fn(),
}))
vi.mock('@/modules/provisions/service', () => ({
  listBudgetProvisions: vi.fn(),
}))
vi.mock('@/modules/salary/service', () => ({
  listSalaryPayments: vi.fn(),
  listSalaryPeriods: vi.fn(),
}))
vi.mock('@/modules/wishes/service', () => ({
  listWishes: vi.fn(),
  syncWishProjections: vi.fn(),
}))

const { createPlanningRefreshService } = await import('@/modules/planning/planning-refresh-service')

describe('planning refresh service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryPlanningData.mockResolvedValue({
      budgetProvisions: [],
      goalContributions: [],
      goals: [],
      paymentEntries: [],
      recentScores: [{ id: 'score-old' }],
      recurringExpenses: [],
      salaryPayments: [],
      salaryPeriods: [],
      wishes: [],
    })
    resolvePlanningData.mockReturnValue({
      goalContributions: [{ id: 'gc-1' }],
      goals: [{ id: 'g-1' }],
      wishes: [{ id: 'w-1' }],
    })
    evaluatePlanningState.mockReturnValue({
      currentScorePayload: { breakdown: { total_score: 80 } },
      goalSnapshots: [{ id: 'gs-1' }],
      overview: { assignableAmount: 50 },
      wishProjectionSyncInputs: [],
      wishProjections: [{ id: 'wp-1' }],
    })
    persistPlanningSideEffects.mockResolvedValue({ id: 'score-new' })
    mergePlanningScores.mockReturnValue([{ id: 'score-new' }, { id: 'score-old' }])
    getCurrentWeekStart.mockReturnValue('2026-03-16')
  })

  it('returns a consolidated refresh result from application-layer steps', async () => {
    const service = createPlanningRefreshService()

    const result = await service.refresh({
      existingState: {
        goalContributions: [],
        goals: [],
        wishes: [],
      },
      refreshArgs: {
        isDevBypass: false,
        settings: null,
        userId: 'user-1',
        wallets: [],
      },
    })

    expect(queryPlanningData).toHaveBeenCalledOnce()
    expect(resolvePlanningData).toHaveBeenCalledOnce()
    expect(evaluatePlanningState).toHaveBeenCalledOnce()
    expect(persistPlanningSideEffects).toHaveBeenCalledOnce()
    expect(result).toEqual({
      currentScore: { id: 'score-new' },
      goalContributions: [{ id: 'gc-1' }],
      goalSnapshots: [{ id: 'gs-1' }],
      goals: [{ id: 'g-1' }],
      overview: { assignableAmount: 50 },
      recentScores: [{ id: 'score-new' }, { id: 'score-old' }],
      wishProjections: [{ id: 'wp-1' }],
      wishes: [{ id: 'w-1' }],
    })
  })
})
