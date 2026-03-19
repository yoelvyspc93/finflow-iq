import { describe, expect, it } from 'vitest'

import { resolvePlanningData } from '@/modules/planning/planning-resolution'
import type { PlanningExistingState, PlanningFetchedData } from '@/modules/planning/refresh-types'

const existingState: PlanningExistingState = {
  wishes: [{ id: 'local-wish' }] as never[],
}

function createFetchedData(overrides?: Partial<PlanningFetchedData>): PlanningFetchedData {
  return {
    budgetProvisions: [],
    paymentEntries: [],
    recentScores: [],
    recurringExpenses: [],
    salaryPayments: [],
    salaryPeriods: [],
    wishes: null,
    ...overrides,
  }
}

describe('planning resolution', () => {
  it('reuses local dev state when query intentionally skipped collections', () => {
    const resolved = resolvePlanningData({
      existingState,
      fetchedData: createFetchedData(),
      isDevBypass: true,
      userId: 'user-1',
    })

    expect(resolved.wishes).toEqual(existingState.wishes)
  })

  it('creates wish mocks only when dev mode resolves empty collections', () => {
    const resolved = resolvePlanningData({
      existingState: {
        wishes: [],
      },
      fetchedData: createFetchedData({
        wishes: [],
      }),
      isDevBypass: true,
      userId: 'user-1',
    })

    expect(resolved.wishes.length).toBeGreaterThan(0)
  })
})
