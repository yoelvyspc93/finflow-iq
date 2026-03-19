import { describe, expect, it } from 'vitest'

import { resolvePlanningData } from '@/modules/planning/planning-resolution'
import type { PlanningFetchedData } from '@/modules/planning/refresh-types'

function createFetchedData(overrides?: Partial<PlanningFetchedData>): PlanningFetchedData {
  return {
    budgetProvisions: [],
    paymentEntries: [],
    recentScores: [],
    recurringExpenses: [],
    salaryPayments: [],
    salaryPeriods: [],
    wishes: [],
    ...overrides,
  }
}

describe('planning resolution', () => {
  it('returns fetched wishes as-is', () => {
    const resolved = resolvePlanningData({
      fetchedData: createFetchedData({
        wishes: [{ id: 'wish-1' }] as never[],
      }),
    })

    expect(resolved.wishes).toEqual([{ id: 'wish-1' }])
  })
})
