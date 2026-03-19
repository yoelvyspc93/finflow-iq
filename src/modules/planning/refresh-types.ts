import type { FinancialScore } from '@/modules/insights/score'
import type { PlanningOverview } from '@/modules/planning/orchestrator'
import type { BudgetProvision } from '@/modules/provisions/types'
import type { SalaryPayment, SalaryPeriod } from '@/modules/salary/types'
import type { AppSettings } from '@/modules/settings/types'
import type { Wallet } from '@/modules/wallets/types'
import type { WishProjection } from '@/modules/wishes/calculations'
import type { Wish } from '@/modules/wishes/types'
import type { LedgerEntry } from '@/modules/ledger/types'
import type { RecurringExpense } from '@/modules/commitments/types'

export type RefreshPlanningDataArgs = {
  isDevBypass: boolean
  settings: AppSettings | null
  userId: string
  wallets: Wallet[]
}

export type PlanningExistingState = {
  wishes: Wish[]
}

export type PlanningFetchedData = {
  budgetProvisions: BudgetProvision[]
  paymentEntries: LedgerEntry[]
  recentScores: FinancialScore[]
  recurringExpenses: RecurringExpense[]
  salaryPayments: SalaryPayment[]
  salaryPeriods: SalaryPeriod[]
  wishes: Wish[] | null
}

export type PlanningResolvedData = {
  wishes: Wish[]
}

export type PlanningRefreshResult = {
  currentScore: FinancialScore | null
  overview: PlanningOverview | null
  recentScores: FinancialScore[]
  wishProjections: WishProjection[]
  wishes: Wish[]
}
