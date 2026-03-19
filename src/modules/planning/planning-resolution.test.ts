import { describe, expect, it } from 'vitest'

import { resolvePlanningData } from '@/modules/planning/planning-resolution'
import type { PlanningExistingState, PlanningFetchedData } from '@/modules/planning/refresh-types'

const existingState: PlanningExistingState = {
  goalContributions: [{ id: 'local-gc' }] as never[],
  goals: [{ id: 'local-goal' }] as never[],
  wishes: [{ id: 'local-wish' }] as never[],
}

function createFetchedData(overrides?: Partial<PlanningFetchedData>): PlanningFetchedData {
  return {
    budgetProvisions: [],
    goalContributions: null,
    goals: null,
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

    expect(resolved.goals).toEqual(existingState.goals)
    expect(resolved.goalContributions).toEqual(existingState.goalContributions)
    expect(resolved.wishes).toEqual(existingState.wishes)
  })

  it('creates mocks only when dev mode resolves empty collections', () => {
    const resolved = resolvePlanningData({
      existingState: {
        goalContributions: [],
        goals: [],
        wishes: [],
      },
      fetchedData: createFetchedData({
        goalContributions: [],
        goals: [],
        wishes: [],
      }),
      isDevBypass: true,
      userId: 'user-1',
    })

    expect(resolved.goals.length).toBeGreaterThan(0)
    expect(resolved.goalContributions.length).toBeGreaterThan(0)
    expect(resolved.wishes.length).toBeGreaterThan(0)
  })
})
