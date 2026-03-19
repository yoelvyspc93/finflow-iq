import { listCommitmentPaymentEntries, listRecurringExpenses } from '@/modules/commitments/service'
import { listGoalContributions, listGoals } from '@/modules/goals/service'
import { listFinancialScores } from '@/modules/insights/score'
import { listBudgetProvisions } from '@/modules/provisions/service'
import { listSalaryPayments, listSalaryPeriods } from '@/modules/salary/service'
import { listWishes } from '@/modules/wishes/service'
import type {
  PlanningExistingState,
  PlanningFetchedData,
  RefreshPlanningDataArgs,
} from '@/modules/planning/refresh-types'

export type PlanningQueryDependencies = {
  listBudgetProvisions: typeof listBudgetProvisions
  listCommitmentPaymentEntries: typeof listCommitmentPaymentEntries
  listFinancialScores: typeof listFinancialScores
  listGoalContributions: typeof listGoalContributions
  listGoals: typeof listGoals
  listRecurringExpenses: typeof listRecurringExpenses
  listSalaryPayments: typeof listSalaryPayments
  listSalaryPeriods: typeof listSalaryPeriods
  listWishes: typeof listWishes
}

export async function queryPlanningData(args: {
  currentMonth: string
  dependencies: PlanningQueryDependencies
  existingState: PlanningExistingState
  refreshArgs: RefreshPlanningDataArgs
}): Promise<PlanningFetchedData> {
  const { dependencies, existingState, refreshArgs } = args
  const { isDevBypass, userId } = refreshArgs

  const [
    salaryPeriods,
    salaryPayments,
    recurringExpenses,
    budgetProvisions,
    paymentEntries,
    recentScores,
  ] = await Promise.all([
    dependencies.listSalaryPeriods({ isDevBypass, userId }),
    dependencies.listSalaryPayments({ isDevBypass, userId }),
    dependencies.listRecurringExpenses({ isDevBypass, userId }),
    dependencies.listBudgetProvisions({ isDevBypass, userId }),
    dependencies.listCommitmentPaymentEntries({
      isDevBypass,
      month: args.currentMonth,
      userId,
    }),
    dependencies.listFinancialScores({ isDevBypass, userId }),
  ])

  const shouldReuseExistingDevState = isDevBypass
  const goals =
    shouldReuseExistingDevState && existingState.goals.length > 0
      ? null
      : await dependencies.listGoals({ isDevBypass, userId })
  const goalContributions =
    shouldReuseExistingDevState && existingState.goalContributions.length > 0
      ? null
      : await dependencies.listGoalContributions({ isDevBypass, userId })
  const wishes =
    shouldReuseExistingDevState && existingState.wishes.length > 0
      ? null
      : await dependencies.listWishes({ isDevBypass, userId })

  return {
    budgetProvisions,
    goalContributions,
    goals,
    paymentEntries,
    recentScores,
    recurringExpenses,
    salaryPayments,
    salaryPeriods,
    wishes,
  }
}
