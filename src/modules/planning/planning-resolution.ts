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
  const wishes = fetchedData.wishes ?? existingState.wishes

  return {
    wishes: isDevBypass && wishes.length === 0 ? createMockWishes(userId) : wishes,
  }
}
