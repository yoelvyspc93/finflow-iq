import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GoalProgressSnapshot } from '@/modules/goals/calculations'
import type { WishProjection } from '@/modules/wishes/calculations'
import { createMockWallet } from '@/modules/wallets/types'
import {
  buildCommitmentDraft,
  buildContributionDraft,
  buildGoalDraft,
  buildPlanningActionTip,
  buildWishDraft,
  filterWishProjectionItems,
  getActiveGoalSnapshots,
  getNextWishAmount,
  getNextWishPriority,
} from '@/modules/planning/view-model'

function createGoalSnapshot(input: Partial<GoalProgressSnapshot>): GoalProgressSnapshot {
  return {
    contributedAmount: 200,
    goal: {
      createdAt: '2026-03-01T00:00:00.000Z',
      deadline: null,
      icon: null,
      id: 'goal-1',
      name: 'Emergency Fund',
      status: 'active',
      targetAmount: 1000,
      updatedAt: '2026-03-01T00:00:00.000Z',
      userId: 'user-1',
      walletId: 'wallet-1',
    },
    isOverdue: false,
    projectedCompletionDate: null,
    progressRatio: 0.2,
    remainingAmount: 800,
    status: 'active',
    ...input,
  }
}

function createWishProjection(input: Partial<WishProjection>): WishProjection {
  return {
    confidenceLevel: 'medium',
    confidenceReason: 'OK',
    estimatedPurchaseDate: null,
    monthsUntilPurchase: 2,
    progressRatio: 0.4,
    wish: {
      aiAdvice: null,
      confidenceLevel: null,
      confidenceReason: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      estimatedAmount: 300,
      estimatedPurchaseDate: null,
      id: 'wish-1',
      isPurchased: false,
      lastAiAdviceAt: null,
      lastCalculatedAt: null,
      name: 'Headphones',
      notes: null,
      priority: 1,
      purchasedAt: null,
      updatedAt: '2026-03-01T00:00:00.000Z',
      userId: 'user-1',
      walletId: 'wallet-1',
    },
    ...input,
  }
}

describe('planning view model', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters active goals and builds default goal/contribution drafts', () => {
    const snapshots = [
      createGoalSnapshot({ goal: { ...createGoalSnapshot({}).goal, id: 'goal-1', status: 'active' }, status: 'active' }),
      createGoalSnapshot({ goal: { ...createGoalSnapshot({}).goal, id: 'goal-2', status: 'paused' }, status: 'paused' }),
      createGoalSnapshot({ goal: { ...createGoalSnapshot({}).goal, id: 'goal-3', status: 'completed' }, status: 'at_risk' }),
    ]
    const wallets = [
      createMockWallet({ currency: 'USD', id: 'wallet-1', name: 'Main', userId: 'user-1' }),
    ]

    const activeGoals = getActiveGoalSnapshots(snapshots)

    expect(activeGoals.map((item) => item.goal.id)).toEqual(['goal-1', 'goal-3'])
    expect(buildGoalDraft(wallets).walletId).toBe('wallet-1')
    expect(buildContributionDraft(activeGoals)).toEqual({
      amount: '',
      date: '2026-03-18',
      goalId: 'goal-1',
      note: '',
    })
  })

  it('filters wishes and computes next priority and amount', () => {
    const projections = [
      createWishProjection({ wish: { ...createWishProjection({}).wish, id: 'wish-1', isPurchased: false, priority: 1, estimatedAmount: 300 } }),
      createWishProjection({ wish: { ...createWishProjection({}).wish, id: 'wish-2', isPurchased: true, priority: 3, estimatedAmount: 120 } }),
      createWishProjection({ wish: { ...createWishProjection({}).wish, id: 'wish-3', isPurchased: false, priority: 2, estimatedAmount: 700 } }),
    ]

    expect(filterWishProjectionItems({ filter: 'pending', items: projections })).toHaveLength(2)
    expect(filterWishProjectionItems({ filter: 'bought', items: projections })).toHaveLength(1)
    expect(getNextWishAmount(projections)).toBe(300)
    expect(getNextWishPriority(projections)).toBe('4')
  })

  it('builds wish and commitment drafts from wallets and current state', () => {
    const wallets = [
      createMockWallet({ currency: 'USD', id: 'wallet-1', name: 'Main', userId: 'user-1' }),
      createMockWallet({ currency: 'CUP', id: 'wallet-2', name: 'Cash', position: 1, userId: 'user-1' }),
    ]
    const wishProjections = [
      createWishProjection({ wish: { ...createWishProjection({}).wish, priority: 2 } }),
    ]

    expect(buildWishDraft({ wallets, wishProjections })).toEqual({
      amount: '',
      name: '',
      notes: '',
      priority: '3',
      walletId: 'wallet-1',
    })
    expect(
      buildCommitmentDraft({ selectedWalletId: 'wallet-2', wallets }),
    ).toEqual({
      amount: '',
      day: '18',
      kind: 'fixed',
      month: '2026-03',
      name: '',
      notes: '',
      walletId: 'wallet-2',
    })
  })

  it('builds planning action tips for available margin and blocked scenarios', () => {
    expect(
      buildPlanningActionTip({
        assignableAmount: 500,
        goalShortfall: 200,
        nextWishAmount: 700,
      }),
    ).toContain('500')

    expect(
      buildPlanningActionTip({
        assignableAmount: 350,
        goalShortfall: 0,
        nextWishAmount: 300,
      }),
    ).toBe('Tu primera prioridad ya cabe en el dinero asignable actual.')

    expect(
      buildPlanningActionTip({
        assignableAmount: 50,
        goalShortfall: 0,
        nextWishAmount: 300,
      }),
    ).toContain('ahorro estable')
  })
})
