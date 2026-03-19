import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinancialScore } from '@/modules/insights/score'
import {
  averageMonthlyIncome,
  buildPlanningOverview,
  evaluatePlanningState,
  mergePlanningScores,
} from '@/modules/planning/orchestrator'

function createSettings(userId: string) {
  return {
    aiAnalysisFrequency: 'manual' as const,
    alertLevel: 'normal' as const,
    avgMonthsWithoutPayment: 0,
    createdAt: '2026-03-01T00:00:00.000Z',
    dateFormat: 'DD/MM/YYYY' as const,
    financialMonthStartDay: 1,
    id: 'settings-1',
    primaryCurrency: 'USD' as const,
    salaryReferenceAmount: null,
    savingsGoalPercent: 20,
    sessionTimeoutMinutes: 5 as const,
    subscriptionAlertDays: 3,
    theme: 'dark' as const,
    updatedAt: '2026-03-01T00:00:00.000Z',
    usdCupRate: null,
    userId,
    weeklySummaryDay: 'monday' as const,
  }
}

function createWallet(args: {
  currency: string
  id: string
  name: string
  userId: string
}) {
  return {
    balance: 0,
    color: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    currency: args.currency,
    icon: null,
    id: args.id,
    isActive: true,
    name: args.name,
    position: 0,
    updatedAt: '2026-03-01T00:00:00.000Z',
    userId: args.userId,
  }
}

function createWishes(userId: string) {
  return [
    {
      aiAdvice: null,
      confidenceLevel: null,
      confidenceReason: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      estimatedAmount: 350,
      estimatedPurchaseDate: null,
      id: 'wish-1',
      isPurchased: false,
      lastAiAdviceAt: null,
      lastCalculatedAt: null,
      name: 'Sony WH-1000XM5',
      notes: 'Esperar una oferta',
      priority: 1,
      purchasedAt: null,
      updatedAt: '2026-03-01T00:00:00.000Z',
      userId,
      walletId: 'wallet-1',
    },
  ]
}

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

  it('evaluates overview, score payload and wish sync data without goals', () => {
    const userId = 'user-1'
    const settings = {
      ...createSettings(userId),
      avgMonthsWithoutPayment: 2,
      salaryReferenceAmount: 1000,
      savingsGoalPercent: 10,
    }
    const wallets = [
      { ...createWallet({ currency: 'USD', id: 'wallet-1', name: 'Main', userId }), balance: 1500 },
    ]

    const result = evaluatePlanningState({
      budgetProvisions: [],
      currentMonth: '2026-03-01',
      nowIso: '2026-03-18T12:00:00.000Z',
      paymentEntries: [],
      recentScores: [],
      recurringExpenses: [],
      salaryPayments: [],
      salaryPeriods: [],
      settings,
      userId,
      wallets,
      wishes: createWishes(userId),
    })

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
      monthlyCommitmentAverage: 100,
      monthlyIncome: 900,
      pendingSalaryAmount: 50,
      reserveAmount: 150,
      wishProjections: [],
    })

    expect(overview.assignableAmount).toBe(650)
    expect(overview.totalWishEstimated).toBe(0)
  })
})
