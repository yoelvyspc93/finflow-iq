import { describe, expect, it } from 'vitest'

import { buildWishSimulationResults } from '@/modules/ai/simulation'

describe('ai simulation', () => {
  it('builds deterministic scenarios for a wish', () => {
    const results = buildWishSimulationResults({
      currentScore: {
        aiTip: null,
        breakdown: {
          commitment_score: 60,
          liquidity_score: 70,
          salary_stability_score: 65,
          savings_score: 55,
          total_score: 68,
          wishlist_pressure_score: 50,
        },
        createdAt: '2026-03-20T00:00:00.000Z',
        id: 'score-1',
        score: 68,
        userId: 'user-1',
        weekStart: '2026-03-16',
      },
      overview: {
        assignableAmount: 120,
        availableBalance: 500,
        committedAmount: 180,
        monthlyCommitmentAverage: 200,
        monthlyIncome: 1000,
        pendingSalaryAmount: 150,
        reserveAmount: 200,
        totalWishEstimated: 260,
      },
      userId: 'user-1',
      wishProjection: {
        confidenceLevel: 'medium',
        confidenceReason: 'Depende del flujo.',
        estimatedPurchaseDate: '2026-05-01',
        monthsUntilPurchase: 2,
        progressRatio: 0.5,
        wish: {
          actualPurchaseAmount: null,
          aiAdvice: null,
          confidenceLevel: null,
          confidenceReason: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          estimatedAmount: 100,
          estimatedPurchaseDate: null,
          id: 'wish-1',
          isPurchased: false,
          lastAiAdviceAt: null,
          lastCalculatedAt: null,
          name: 'Monitor',
          notes: null,
          purchaseLedgerEntryId: null,
          priority: 1,
          purchasedAt: null,
          updatedAt: '2026-03-01T00:00:00.000Z',
          userId: 'user-1',
          walletId: 'wallet-1',
        },
      },
    })

    expect(results).toHaveLength(3)
    expect(results[0]?.scenario).toBe('buy_now')
    expect(results[0]?.after.availableBalance).toBe(400)
    expect(results[2]?.scenario).toBe('collect_pending_salary')
    expect(results[2]?.after.pendingSalaryAmount).toBe(0)
    expect(results[2]?.after.assignableAmount).toBe(270)
  })
})
