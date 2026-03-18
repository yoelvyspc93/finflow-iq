import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinancialScore } from '@/modules/insights/score'
import { createMockGoals, createMockGoalContributions } from '@/modules/goals/types'
import {
  averageMonthlyIncome,
  buildPlanningOverview,
  evaluatePlanningState,
  mergePlanningScores,
} from '@/modules/planning/orchestrator'
import { createMockSettings } from '@/modules/settings/types'
import { createMockWallet } from '@/modules/wallets/types'
import { createMockWishes } from '@/modules/wishes/types'

describe('planning orchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses fallback salary first and merges scores by week', () => {
    expect(
      averageMonthlyIncome({
        fallback: 1200,
        payments: [{ grossAmount: 500, paymentDate: '2026-03-01' }],
      }),
    ).toBe(1200)

    const older: FinancialScore = {
      aiTip: null,
      breakdown: {
        commitment_score: 60,
        liquidity_score: 60,
        salary_stability_score: 60,
        savings_score: 60,
        total_score: 60,
        wishlist_pressure_score: 60,
      },
      createdAt: '2026-03-01T00:00:00.000Z',
      id: 'score-old',
      score: 60,
      userId: 'user-1',
      weekStart: '2026-03-10',
    }
    const newer: FinancialScore = {
      ...older,
      id: 'score-new',
      score: 80,
      weekStart: '2026-03-17',
    }

    const merged = mergePlanningScores(newer, [older])
    expect(merged.map((item) => item.weekStart)).toEqual(['2026-03-17', '2026-03-10'])
  })

  it('evaluates overview, score payload and wish sync data', () => {
    const userId = 'user-1'
    const settings = {
      ...createMockSettings(userId),
      avgMonthsWithoutPayment: 2,
      salaryReferenceAmount: 1000,
      savingsGoalPercent: 10,
    }
    const wallets = [
      { ...createMockWallet({ currency: 'USD', id: 'wallet-1', name: 'Main', userId }), balance: 1500 },
    ]

    const result = evaluatePlanningState({
      budgetProvisions: [],
      currentMonth: '2026-03-01',
      goalContributions: createMockGoalContributions(userId),
      goals: createMockGoals(userId),
      nowIso: '2026-03-18T12:00:00.000Z',
      paymentEntries: [],
      recentScores: [],
      recurringExpenses: [],
      salaryPayments: [],
      salaryPeriods: [],
      settings,
      userId,
      wallets,
      wishes: createMockWishes(userId),
    })

    expect(result.goalSnapshots.length).toBeGreaterThan(0)
    expect(result.overview.availableBalance).toBe(1500)
    expect(result.currentScorePayload.breakdown.total_score).toBeGreaterThanOrEqual(0)
    expect(result.wishProjectionSyncInputs[0]?.lastCalculatedAt).toBe(
      '2026-03-18T12:00:00.000Z',
    )
  })

  it('builds overview aggregates consistently', () => {
    const overview = buildPlanningOverview({
      availableBalance: 1000,
      committedAmount: 200,
      goalContributions: [],
      goalSnapshots: [],
      monthlyCommitmentAverage: 100,
      monthlyIncome: 900,
      pendingSalaryAmount: 50,
      reserveAmount: 150,
      wishProjections: [],
    })

    expect(overview.assignableAmount).toBe(650)
    expect(overview.totalGoalTarget).toBe(0)
    expect(overview.totalWishEstimated).toBe(0)
  })
})
