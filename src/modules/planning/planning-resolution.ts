import type {
  PlanningFetchedData,
  PlanningResolvedData,
} from '@/modules/planning/refresh-types'

export function resolvePlanningData(args: {
  fetchedData: PlanningFetchedData
}): PlanningResolvedData {
  return {
    wishes: args.fetchedData.wishes,
  }
}
