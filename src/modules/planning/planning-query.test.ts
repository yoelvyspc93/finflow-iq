import { describe, expect, it, vi } from 'vitest'

import { queryPlanningData, type PlanningQueryDependencies } from '@/modules/planning/planning-query'

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

describe('planning query', () => {
  it('fetches all planning collections from dependencies', async () => {
    const dependencies = createDependencies()

    const result = await queryPlanningData({
      currentMonth: '2026-03-01',
      dependencies,
      refreshArgs: {
        settings: null,
        userId: 'user-1',
        wallets: [],
      },
    })

    expect(result.wishes).toEqual([{ id: 'w-1' }])
    expect(dependencies.listSalaryPeriods).toHaveBeenCalledOnce()
    expect(dependencies.listSalaryPayments).toHaveBeenCalledOnce()
    expect(dependencies.listRecurringExpenses).toHaveBeenCalledOnce()
    expect(dependencies.listBudgetProvisions).toHaveBeenCalledOnce()
    expect(dependencies.listCommitmentPaymentEntries).toHaveBeenCalledOnce()
    expect(dependencies.listFinancialScores).toHaveBeenCalledOnce()
    expect(dependencies.listWishes).toHaveBeenCalledOnce()
  })
})
