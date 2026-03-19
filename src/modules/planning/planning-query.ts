import { listCommitmentPaymentEntries, listRecurringExpenses } from '@/modules/commitments/service'
import { listFinancialScores } from '@/modules/insights/score'
import { listBudgetProvisions } from '@/modules/provisions/service'
import { listSalaryPayments, listSalaryPeriods } from '@/modules/salary/service'
import { listWishes } from '@/modules/wishes/service'
import type {
  PlanningFetchedData,
  RefreshPlanningDataArgs,
} from '@/modules/planning/refresh-types'

export type PlanningQueryDependencies = {
  listBudgetProvisions: typeof listBudgetProvisions
  listCommitmentPaymentEntries: typeof listCommitmentPaymentEntries
  listFinancialScores: typeof listFinancialScores
  listRecurringExpenses: typeof listRecurringExpenses
  listSalaryPayments: typeof listSalaryPayments
  listSalaryPeriods: typeof listSalaryPeriods
  listWishes: typeof listWishes
}

export async function queryPlanningData(args: {
  currentMonth: string
  dependencies: PlanningQueryDependencies
  refreshArgs: RefreshPlanningDataArgs
}): Promise<PlanningFetchedData> {
  const { dependencies, refreshArgs } = args
  const { userId } = refreshArgs

  const [
    salaryPeriods,
    salaryPayments,
    recurringExpenses,
    budgetProvisions,
    paymentEntries,
    recentScores,
    wishes,
  ] = await Promise.all([
    dependencies.listSalaryPeriods({ userId }),
    dependencies.listSalaryPayments({ userId }),
    dependencies.listRecurringExpenses({ userId }),
    dependencies.listBudgetProvisions({ userId }),
    dependencies.listCommitmentPaymentEntries({
      month: args.currentMonth,
      userId,
    }),
    dependencies.listFinancialScores({ userId }),
    dependencies.listWishes({ userId }),
  ])

  return {
    budgetProvisions,
    paymentEntries,
    recentScores,
    recurringExpenses,
    salaryPayments,
    salaryPeriods,
    wishes,
  }
}
