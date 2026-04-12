import { describe, expect, it } from 'vitest'

import {
  buildWeeklyFinancialContext,
  buildWishAdviceContext,
} from '@/modules/ai/context-builder'
import type { FinancialScore } from '@/modules/insights/score'

function createSettings(userId: string) {
  return {
    aiAnalysisFrequency: 'manual' as const,
    alertLevel: 'normal' as const,
    avgMonthsWithoutPayment: 2,
    createdAt: '2026-03-01T00:00:00.000Z',
    dateFormat: 'DD/MM/YYYY' as const,
    financialMonthStartDay: 1,
    id: 'settings-1',
    primaryCurrency: 'USD' as const,
    salaryReferenceAmount: 1200,
    savingsGoalPercent: 15,
    sessionTimeoutMinutes: 5 as const,
    subscriptionAlertDays: 3,
    theme: 'dark' as const,
    updatedAt: '2026-03-01T00:00:00.000Z',
    usdCupRate: null,
    userId,
    weeklySummaryDay: 'monday' as const,
  }
}

function createFinancialScore(args: {
  id: string
  score: number
  weekStart: string
}): FinancialScore {
  return {
    aiTip: null,
    breakdown: {
      commitment_score: 62,
      liquidity_score: 74,
      salary_stability_score: 58,
      savings_score: 61,
      total_score: args.score,
      wishlist_pressure_score: 47,
    },
    createdAt: `${args.weekStart}T00:00:00.000Z`,
    id: args.id,
    score: args.score,
    userId: 'user-1',
    weekStart: args.weekStart,
  }
}

describe('ai context builder', () => {
  it('builds a weekly snapshot from resolved planning state', () => {
    const currentScore = createFinancialScore({
      id: 'score-current',
      score: 67,
      weekStart: '2026-03-16',
    })
    const context = buildWeeklyFinancialContext('user-1', {
      commitmentOverview: {
        activeMonth: '2026-03',
        budgetProvisionCommitted: 90,
        budgetProvisionPaid: 20,
        budgetProvisionRemaining: 70,
        provisions: [
          {
            appliesToMonth: true,
            committedAmount: 90,
            paidAmount: 20,
            provision: {
              amount: 90,
              categoryId: null,
              createdAt: '2026-03-01T00:00:00.000Z',
              id: 'provision-1',
              isActive: true,
              month: '2026-03-01',
              name: 'Internet',
              notes: null,
              recurrence: 'monthly',
              updatedAt: '2026-03-01T00:00:00.000Z',
              userId: 'user-1',
              walletId: 'wallet-1',
            },
            remainingAmount: 70,
          },
        ],
        recurringCommitted: 110,
        recurringExpenses: [
          {
            appliesToMonth: true,
            committedAmount: 110,
            expense: {
              amount: 110,
              billingDay: 10,
              billingMonth: null,
              categoryId: null,
              createdAt: '2026-03-01T00:00:00.000Z',
              frequency: 'monthly',
              id: 'recurring-1',
              isActive: true,
              name: 'Alquiler',
              notes: null,
              type: 'fixed',
              updatedAt: '2026-03-01T00:00:00.000Z',
              userId: 'user-1',
              walletId: 'wallet-1',
            },
            paidAmount: 0,
            remainingAmount: 110,
          },
        ],
        recurringPaid: 0,
        recurringRemaining: 110,
        totalCommitted: 200,
        totalPaid: 20,
        totalRemaining: 180,
        walletId: null,
      },
      currentScore,
      generatedAt: '2026-03-20T12:00:00.000Z',
      overview: {
        assignableAmount: 120,
        availableBalance: 500,
        committedAmount: 180,
        monthlyCommitmentAverage: 200,
        monthlyIncome: 1200,
        pendingSalaryAmount: 300,
        reserveAmount: 200,
        totalWishEstimated: 260,
      },
      recentScores: [
        createFinancialScore({ id: 'score-1', score: 74, weekStart: '2026-02-24' }),
        createFinancialScore({ id: 'score-2', score: 70, weekStart: '2026-03-03' }),
        createFinancialScore({ id: 'score-3', score: 69, weekStart: '2026-03-10' }),
      ],
      salaryOverview: {
        coveredPeriods: 2,
        lastPaymentDate: '2026-03-12',
        monthsWithoutPayment: 1,
        pendingTotal: 300,
        totalAllocated: 900,
        totalReceived: 900,
      },
      settings: createSettings('user-1'),
      wallets: [
        {
          balance: 500,
          color: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          currency: 'USD',
          icon: null,
          id: 'wallet-1',
          isActive: true,
          name: 'Principal',
          position: 0,
          updatedAt: '2026-03-01T00:00:00.000Z',
          userId: 'user-1',
        },
      ],
      wishProjections: [
        {
          confidenceLevel: 'medium',
          confidenceReason: 'Depende de mantener el ahorro.',
          estimatedPurchaseDate: '2026-05-01',
          monthsUntilPurchase: 2,
          progressRatio: 0.4,
          wish: {
            actualPurchaseAmount: null,
            aiAdvice: null,
            confidenceLevel: null,
            confidenceReason: null,
            createdAt: '2026-03-01T00:00:00.000Z',
            estimatedAmount: 200,
            estimatedPurchaseDate: null,
            id: 'wish-1',
            isPurchased: false,
            lastAiAdviceAt: null,
            lastCalculatedAt: null,
            name: 'Telefono',
            notes: 'Trabajo diario',
            purchaseLedgerEntryId: null,
            priority: 1,
            purchasedAt: null,
            updatedAt: '2026-03-01T00:00:00.000Z',
            userId: 'user-1',
            walletId: 'wallet-1',
          },
        },
        {
          confidenceLevel: 'low',
          confidenceReason: 'Conviene esperar.',
          estimatedPurchaseDate: '2026-06-01',
          monthsUntilPurchase: 3,
          progressRatio: 0.2,
          wish: {
            actualPurchaseAmount: null,
            aiAdvice: null,
            confidenceLevel: null,
            confidenceReason: null,
            createdAt: '2026-03-01T00:00:00.000Z',
            estimatedAmount: 60,
            estimatedPurchaseDate: null,
            id: 'wish-2',
            isPurchased: false,
            lastAiAdviceAt: null,
            lastCalculatedAt: null,
            name: 'Audifonos',
            notes: null,
            purchaseLedgerEntryId: null,
            priority: 2,
            purchasedAt: null,
            updatedAt: '2026-03-01T00:00:00.000Z',
            userId: 'user-1',
            walletId: 'wallet-1',
          },
        },
      ],
    })

    expect(context.scope).toBe('weekly_summary')
    expect(context.summary.financialScore).toBe(67)
    expect(context.summary.previousFinancialScore).toBe(69)
    expect(context.wishlist.totalActiveWishes).toBe(2)
    expect(context.wishlist.items[0]?.impactOnAssignableAmount).toBe(-80)
    expect(context.trend.last4WeeksScores).toEqual([74, 70, 69, 67])
  })

  it('builds a wish advice snapshot for a selected projection', () => {
    const currentScore = createFinancialScore({
      id: 'score-current',
      score: 64,
      weekStart: '2026-03-16',
    })

    const context = buildWishAdviceContext('user-1', {
      commitmentOverview: {
        activeMonth: '2026-03',
        budgetProvisionCommitted: 50,
        budgetProvisionPaid: 20,
        budgetProvisionRemaining: 30,
        provisions: [],
        recurringCommitted: 80,
        recurringExpenses: [],
        recurringPaid: 0,
        recurringRemaining: 80,
        totalCommitted: 130,
        totalPaid: 20,
        totalRemaining: 110,
        walletId: null,
      },
      currentScore,
      generatedAt: '2026-03-20T12:00:00.000Z',
      overview: {
        assignableAmount: 100,
        availableBalance: 420,
        committedAmount: 110,
        monthlyCommitmentAverage: 130,
        monthlyIncome: 900,
        pendingSalaryAmount: 120,
        reserveAmount: 210,
        totalWishEstimated: 250,
      },
      settings: createSettings('user-1'),
      wishId: 'wish-1',
      wishProjections: [
        {
          confidenceLevel: 'medium',
          confidenceReason: 'Todavia depende del siguiente cobro.',
          estimatedPurchaseDate: '2026-05-01',
          monthsUntilPurchase: 2,
          progressRatio: 0.4,
          wish: {
            actualPurchaseAmount: null,
            aiAdvice: null,
            confidenceLevel: null,
            confidenceReason: null,
            createdAt: '2026-03-01T00:00:00.000Z',
            estimatedAmount: 170,
            estimatedPurchaseDate: null,
            id: 'wish-1',
            isPurchased: false,
            lastAiAdviceAt: null,
            lastCalculatedAt: null,
            name: 'Laptop',
            notes: 'Para estudio',
            purchaseLedgerEntryId: null,
            priority: 1,
            purchasedAt: null,
            updatedAt: '2026-03-01T00:00:00.000Z',
            userId: 'user-1',
            walletId: 'wallet-1',
          },
        },
        {
          confidenceLevel: 'high',
          confidenceReason: 'Compra pequena.',
          estimatedPurchaseDate: '2026-04-01',
          monthsUntilPurchase: 1,
          progressRatio: 0.8,
          wish: {
            actualPurchaseAmount: null,
            aiAdvice: null,
            confidenceLevel: null,
            confidenceReason: null,
            createdAt: '2026-03-01T00:00:00.000Z',
            estimatedAmount: 80,
            estimatedPurchaseDate: null,
            id: 'wish-2',
            isPurchased: false,
            lastAiAdviceAt: null,
            lastCalculatedAt: null,
            name: 'Mouse',
            notes: null,
            purchaseLedgerEntryId: null,
            priority: 2,
            purchasedAt: null,
            updatedAt: '2026-03-01T00:00:00.000Z',
            userId: 'user-1',
            walletId: 'wallet-1',
          },
        },
      ],
    })

    expect(context.scope).toBe('wish_advice')
    expect(context.wish.id).toBe('wish-1')
    expect(context.wish.isCompetingWithCommitments).toBe(true)
    expect(context.otherWishes).toHaveLength(1)
  })
})
