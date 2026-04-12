import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryPlanningData = vi.fn()
const resolvePlanningData = vi.fn()
const evaluatePlanningState = vi.fn()
const persistPlanningSideEffects = vi.fn()
const mergePlanningScores = vi.fn()
const getCurrentWeekStart = vi.fn()
const generateWeeklyFinancialTip = vi.fn()
const generateWishAdviceBatch = vi.fn()
const generateDashboardHealthSummary = vi.fn()

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
vi.mock('@/modules/ai/service', () => ({
  generateDashboardHealthSummary,
  generateWeeklyFinancialTip,
  generateWishAdviceBatch,
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
      paymentEntries: [],
      recentScores: [{ id: 'score-old' }],
      recurringExpenses: [],
      salaryPayments: [],
      salaryPeriods: [],
      wishes: [],
    })
    resolvePlanningData.mockReturnValue({
      wishes: [{ id: 'w-1' }],
    })
    evaluatePlanningState.mockReturnValue({
      commitmentOverview: { totalCommitted: 0, totalRemaining: 0 },
      currentScorePayload: { breakdown: { total_score: 80 } },
      overview: { assignableAmount: 50 },
      salaryOverview: { pendingTotal: 0 },
      wishProjectionSyncInputs: [],
      wishProjections: [{ id: 'wp-1' }],
    })
    persistPlanningSideEffects.mockResolvedValue({ id: 'score-new' })
    generateWeeklyFinancialTip.mockResolvedValue({ id: 'score-new', aiTip: 'tip' })
    generateWishAdviceBatch.mockResolvedValue({
      wishProjections: [{ id: 'wp-1' }],
      wishes: [{ id: 'w-1', aiAdvice: 'advice' }],
    })
    generateDashboardHealthSummary.mockResolvedValue({
      summary: 'health-summary',
    })
    mergePlanningScores.mockReturnValue([{ id: 'score-new' }, { id: 'score-old' }])
    getCurrentWeekStart.mockReturnValue('2026-03-16')
  })

  it('returns a consolidated refresh result from application-layer steps', async () => {
    const service = createPlanningRefreshService()

    const result = await service.refresh({
      existingState: {
        wishes: [],
      },
      refreshArgs: {
        settings: null,
        userId: 'user-1',
        wallets: [],
      },
    })

    expect(queryPlanningData).toHaveBeenCalledOnce()
    expect(resolvePlanningData).toHaveBeenCalledOnce()
    expect(evaluatePlanningState).toHaveBeenCalledOnce()
    expect(persistPlanningSideEffects).toHaveBeenCalledOnce()
    expect(generateWeeklyFinancialTip).not.toHaveBeenCalled()
    expect(generateWishAdviceBatch).not.toHaveBeenCalled()
    expect(result).toEqual({
      currentScore: { id: 'score-new' },
      dashboardHealth: null,
      overview: { assignableAmount: 50 },
      recentScores: [{ id: 'score-new' }, { id: 'score-old' }],
      wishProjections: [{ id: 'wp-1' }],
      wishes: [{ id: 'w-1' }],
    })
  })

  it('enriches the refresh result with ai insights when settings are available', async () => {
    const service = createPlanningRefreshService()

    const result = await service.refresh({
      existingState: {
        wishes: [],
      },
      refreshArgs: {
        settings: {
          aiAnalysisFrequency: 'manual',
        } as any,
        userId: 'user-1',
        wallets: [],
      },
    })

    expect(generateWeeklyFinancialTip).toHaveBeenCalledOnce()
    expect(generateWishAdviceBatch).toHaveBeenCalledOnce()
    expect(generateDashboardHealthSummary).toHaveBeenCalledOnce()
    expect(result.currentScore).toEqual({ id: 'score-new', aiTip: 'tip' })
    expect(result.dashboardHealth).toEqual({ summary: 'health-summary' })
    expect(result.wishes).toEqual([{ id: 'w-1', aiAdvice: 'advice' }])
  })
})
