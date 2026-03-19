import { describe, expect, it, vi } from 'vitest'

import { queryPlanningData, type PlanningQueryDependencies } from '@/modules/planning/planning-query'
import type { PlanningExistingState } from '@/modules/planning/refresh-types'

function createDependencies(): PlanningQueryDependencies {
  return {
    listBudgetProvisions: vi.fn().mockResolvedValue([]),
    listCommitmentPaymentEntries: vi.fn().mockResolvedValue([]),
    listFinancialScores: vi.fn().mockResolvedValue([]),
    listRecurringExpenses: vi.fn().mockResolvedValue([]),
    listSalaryPayments: vi.fn().mockResolvedValue([]),
    listSalaryPeriods: vi.fn().mockResolvedValue([]),
    listWishes: vi.fn().mockResolvedValue([{ id: 'w-1' }]),
  } as unknown as PlanningQueryDependencies
}

const emptyExistingState: PlanningExistingState = {
  wishes: [],
}

describe('planning query', () => {
  it('skips wish fetches when dev mode already has local state', async () => {
    const dependencies = createDependencies()

    const result = await queryPlanningData({
      currentMonth: '2026-03-01',
      dependencies,
      existingState: {
        wishes: [{ id: 'local-w' }] as never[],
      },
      refreshArgs: {
        isDevBypass: true,
        settings: null,
        userId: 'user-1',
        wallets: [],
      },
    })

    expect(result.wishes).toBeNull()
    expect(dependencies.listWishes).not.toHaveBeenCalled()
  })

  it('fetches wishes in normal mode', async () => {
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

    expect(result.wishes).toEqual([{ id: 'w-1' }])
    expect(dependencies.listWishes).toHaveBeenCalledOnce()
  })
})
