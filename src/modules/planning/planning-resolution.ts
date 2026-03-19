import { createMockGoalContributions, createMockGoals } from '@/modules/goals/types'
import type {
  PlanningExistingState,
  PlanningFetchedData,
  PlanningResolvedData,
} from '@/modules/planning/refresh-types'
import { createMockWishes } from '@/modules/wishes/types'

export function resolvePlanningData(args: {
  existingState: PlanningExistingState
  fetchedData: PlanningFetchedData
  isDevBypass: boolean
  userId: string
}): PlanningResolvedData {
  const { existingState, fetchedData, isDevBypass, userId } = args

  const goals = fetchedData.goals ?? existingState.goals
  const goalContributions =
    fetchedData.goalContributions ?? existingState.goalContributions
  const wishes = fetchedData.wishes ?? existingState.wishes

  return {
    goalContributions:
      isDevBypass && goalContributions.length === 0
        ? createMockGoalContributions(userId)
        : goalContributions,
    goals: isDevBypass && goals.length === 0 ? createMockGoals(userId) : goals,
    wishes: isDevBypass && wishes.length === 0 ? createMockWishes(userId) : wishes,
  }
}
