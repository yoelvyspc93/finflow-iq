import { listCommitmentPaymentEntries, listRecurringExpenses } from '@/modules/commitments/service'
import {
  getCurrentWeekStart,
  listFinancialScores,
  upsertFinancialScore,
} from '@/modules/insights/score'
import { evaluatePlanningState, mergePlanningScores } from '@/modules/planning/orchestrator'
import { persistPlanningSideEffects } from '@/modules/planning/planning-persistence'
import { queryPlanningData } from '@/modules/planning/planning-query'
import { resolvePlanningData } from '@/modules/planning/planning-resolution'
import type {
  PlanningExistingState,
  PlanningRefreshResult,
  RefreshPlanningDataArgs,
} from '@/modules/planning/refresh-types'
import { listBudgetProvisions } from '@/modules/provisions/service'
import { listSalaryPayments, listSalaryPeriods } from '@/modules/salary/service'
import { listWishes, syncWishProjections } from '@/modules/wishes/service'

export function createPlanningRefreshService() {
  return {
    async refresh(args: {
      existingState: PlanningExistingState
      refreshArgs: RefreshPlanningDataArgs
    }): Promise<PlanningRefreshResult> {
      const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`
      const fetchedData = await queryPlanningData({
        currentMonth,
        dependencies: {
          listBudgetProvisions,
          listCommitmentPaymentEntries,
          listFinancialScores,
          listRecurringExpenses,
          listSalaryPayments,
          listSalaryPeriods,
          listWishes,
        },
        existingState: args.existingState,
        refreshArgs: args.refreshArgs,
      })

      const resolvedData = resolvePlanningData({
        existingState: args.existingState,
        fetchedData,
        isDevBypass: args.refreshArgs.isDevBypass,
        userId: args.refreshArgs.userId,
      })

      const evaluation = evaluatePlanningState({
        budgetProvisions: fetchedData.budgetProvisions,
        currentMonth,
        paymentEntries: fetchedData.paymentEntries,
        recentScores: fetchedData.recentScores,
        recurringExpenses: fetchedData.recurringExpenses,
        salaryPayments: fetchedData.salaryPayments,
        salaryPeriods: fetchedData.salaryPeriods,
        settings: args.refreshArgs.settings,
        userId: args.refreshArgs.userId,
        wallets: args.refreshArgs.wallets,
        wishes: resolvedData.wishes,
      })

      const currentScore = await persistPlanningSideEffects({
        dependencies: {
          getCurrentWeekStart,
          syncWishProjections,
          upsertFinancialScore,
        },
        evaluation,
        isDevBypass: args.refreshArgs.isDevBypass,
        userId: args.refreshArgs.userId,
      })

      return {
        currentScore,
        overview: evaluation.overview,
        recentScores: mergePlanningScores(currentScore, fetchedData.recentScores),
        wishProjections: evaluation.wishProjections,
        wishes: resolvedData.wishes,
      }
    },
  }
}

export const planningRefreshService = createPlanningRefreshService()
