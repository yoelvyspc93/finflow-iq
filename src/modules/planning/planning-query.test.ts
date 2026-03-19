import { describe, expect, it, vi } from 'vitest'

import { queryPlanningData, type PlanningQueryDependencies } from '@/modules/planning/planning-query'
import type { PlanningExistingState } from '@/modules/planning/refresh-types'

function createDependencies(): PlanningQueryDependencies {
  return {
    listBudgetProvisions: vi.fn().mockResolvedValue([]),
    listCommitmentPaymentEntries: vi.fn().mockResolvedValue([]),
    listFinancialScores: vi.fn().mockResolvedValue([]),
    listGoalContributions: vi.fn().mockResolvedValue([{ id: 'gc-1' }]),
    listGoals: vi.fn().mockResolvedValue([{ id: 'g-1' }]),
    listRecurringExpenses: vi.fn().mockResolvedValue([]),
    listSalaryPayments: vi.fn().mockResolvedValue([]),
    listSalaryPeriods: vi.fn().mockResolvedValue([]),
    listWishes: vi.fn().mockResolvedValue([{ id: 'w-1' }]),
  } as unknown as PlanningQueryDependencies
}

const emptyExistingState: PlanningExistingState = {
  goalContributions: [],
  goals: [],
  wishes: [],
}

describe('planning query', () => {
  it('skips goal and wish fetches when dev mode already has local state', async () => {
    const dependencies = createDependencies()

    const result = await queryPlanningData({
      currentMonth: '2026-03-01',
      dependencies,
      existingState: {
        goalContributions: [{ id: 'local-gc' }] as never[],
        goals: [{ id: 'local-g' }] as never[],
        wishes: [{ id: 'local-w' }] as never[],
      },
      refreshArgs: {
        isDevBypass: true,
        settings: null,
        userId: 'user-1',
        wallets: [],
      },
    })

    expect(result.goals).toBeNull()
    expect(result.goalContributions).toBeNull()
    expect(result.wishes).toBeNull()
    expect(dependencies.listGoals).not.toHaveBeenCalled()
    expect(dependencies.listGoalContributions).not.toHaveBeenCalled()
    expect(dependencies.listWishes).not.toHaveBeenCalled()
  })

  it('fetches full collections in normal mode', async () => {
    const dependencies = createDependencies()

    const result = await queryPlanningData({
      currentMonth: '2026-03-01',
      dependencies,
      existingState: emptyExistingState,
      refreshArgs: {
        isDevBypass: false,
        settings: null,
        userId: 'user-1',
        wallets: [],
      },
    })

    expect(result.goals).toEqual([{ id: 'g-1' }])
    expect(result.goalContributions).toEqual([{ id: 'gc-1' }])
    expect(result.wishes).toEqual([{ id: 'w-1' }])
    expect(dependencies.listGoals).toHaveBeenCalledOnce()
    expect(dependencies.listGoalContributions).toHaveBeenCalledOnce()
    expect(dependencies.listWishes).toHaveBeenCalledOnce()
  })
})
