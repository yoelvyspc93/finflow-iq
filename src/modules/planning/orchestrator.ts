import {
  calculateCommitmentOverview,
  type CommitmentOverview,
} from '@/modules/commitments/calculations'
import {
  calculateFinancialScore,
  calculateSalaryStabilityScore,
} from '@/modules/insights/score-core'
import type { FinancialScore } from '@/modules/insights/score'
import { calculateSalaryOverview } from '@/modules/salary/calculations'
import type { SalaryPayment, SalaryPeriod } from '@/modules/salary/types'
import type { AppSettings } from '@/modules/settings/types'
import type { Wallet } from '@/modules/wallets/types'
import {
  calculateWishProjections,
  type WishProjection,
} from '@/modules/wishes/calculations'
import type { LedgerEntry } from '@/modules/ledger/types'
import type { BudgetProvision } from '@/modules/provisions/types'
import type { RecurringExpense } from '@/modules/commitments/types'
import type { Wish } from '@/modules/wishes/types'

export type PlanningOverview = {
  assignableAmount: number
  availableBalance: number
  committedAmount: number
  monthlyCommitmentAverage: number
  monthlyIncome: number
  pendingSalaryAmount: number
  reserveAmount: number
  totalWishEstimated: number
}

export type PlanningEvaluationResult = {
  commitmentOverview: CommitmentOverview
  currentScoreInput: ReturnType<typeof calculateFinancialScore>
  currentScorePayload: {
    breakdown: ReturnType<typeof calculateFinancialScore>
    userId: string
  }
  overview: PlanningOverview
  salaryStabilityScore: number
  wishProjectionSyncInputs: {
    confidenceLevel: WishProjection['confidenceLevel']
    confidenceReason: string
    estimatedPurchaseDate: string | null
    lastCalculatedAt: string
    wishId: string
  }[]
  wishProjections: WishProjection[]
}

export function averageMonthlyCommitments(recurringExpenses: {
  amount: number
  frequency: string
  isActive: boolean
}[]) {
  return recurringExpenses.reduce((total, expense) => {
    if (!expense.isActive) {
      return total
    }

    return total + (expense.frequency === 'yearly' ? expense.amount / 12 : expense.amount)
  }, 0)
}

export function averageMonthlyIncome(args: {
  fallback: number | null
  payments: { grossAmount: number; paymentDate: string }[]
}) {
  if (args.fallback && args.fallback > 0) {
    return args.fallback
  }

  if (args.payments.length === 0) {
    return 0
  }

  const recentPayments = [...args.payments]
    .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate))
    .slice(0, 6)

  return (
    recentPayments.reduce((total, payment) => total + payment.grossAmount, 0) /
    recentPayments.length
  )
}

export function buildPlanningOverview(args: {
  availableBalance: number
  committedAmount: number
  monthlyCommitmentAverage: number
  monthlyIncome: number
  pendingSalaryAmount: number
  reserveAmount: number
  wishProjections: WishProjection[]
}): PlanningOverview {
  return {
    assignableAmount:
      args.availableBalance - args.committedAmount - args.reserveAmount,
    availableBalance: args.availableBalance,
    committedAmount: args.committedAmount,
    monthlyCommitmentAverage: args.monthlyCommitmentAverage,
    monthlyIncome: args.monthlyIncome,
    pendingSalaryAmount: args.pendingSalaryAmount,
    reserveAmount: args.reserveAmount,
    totalWishEstimated: args.wishProjections
      .filter((projection) => !projection.wish.isPurchased)
      .reduce((total, projection) => total + projection.wish.estimatedAmount, 0),
  }
}

export function mergePlanningScores(
  currentScore: FinancialScore | null,
  remoteScores: FinancialScore[],
) {
  const byWeek = new Map<string, FinancialScore>()

  for (const score of remoteScores) {
    byWeek.set(score.weekStart, score)
  }

  if (currentScore) {
    byWeek.set(currentScore.weekStart, currentScore)
  }

  return [...byWeek.values()].sort((left, right) =>
    right.weekStart.localeCompare(left.weekStart),
  )
}

export function evaluatePlanningState(args: {
  budgetProvisions: BudgetProvision[]
  currentMonth: string
  nowIso?: string
  paymentEntries: LedgerEntry[]
  recentScores: FinancialScore[]
  recurringExpenses: RecurringExpense[]
  salaryPayments: SalaryPayment[]
  salaryPeriods: SalaryPeriod[]
  settings: AppSettings | null
  userId: string
  wallets: Wallet[]
  wishes: Wish[]
}) {
  const salaryOverview = calculateSalaryOverview(
    args.salaryPeriods,
    args.salaryPayments,
  )
  const commitmentOverview = calculateCommitmentOverview({
    budgetProvisions: args.budgetProvisions,
    month: args.currentMonth,
    paymentEntries: args.paymentEntries,
    recurringExpenses: args.recurringExpenses,
    walletId: null,
  })
  const availableBalance = args.wallets.reduce(
    (total, wallet) => total + (wallet.isActive ? wallet.balance : 0),
    0,
  )
  const monthlyCommitmentAverage = averageMonthlyCommitments(args.recurringExpenses)
  const monthlyIncome = averageMonthlyIncome({
    fallback: args.settings?.salaryReferenceAmount ?? null,
    payments: args.salaryPayments,
  })
  const reserveAmount =
    (args.settings?.avgMonthsWithoutPayment ?? 0) *
    monthlyCommitmentAverage *
    (1 + (args.settings?.savingsGoalPercent ?? 0) / 100)
  const assignableAmount =
    availableBalance - commitmentOverview.totalRemaining - reserveAmount
  const salaryStabilityScore = calculateSalaryStabilityScore({
    monthlyIncome,
    monthsWithoutPayment: salaryOverview.monthsWithoutPayment,
    pendingSalaryAmount: salaryOverview.pendingTotal,
  })
  const monthlySavingCapacity = Math.max(
    monthlyIncome * ((args.settings?.savingsGoalPercent ?? 0) / 100),
    Math.max(assignableAmount, 0),
  )
  const wishProjections = calculateWishProjections({
    assignableAmount,
    monthlySavingCapacity,
    salaryStabilityScore,
    wishes: args.wishes,
  })
  const breakdown = calculateFinancialScore({
    assignableAmount,
    availableBalance,
    committedAmount: commitmentOverview.totalRemaining,
    monthlyCommitmentAverage,
    monthlyIncome,
    monthsWithoutPayment: salaryOverview.monthsWithoutPayment,
    pendingSalaryAmount: salaryOverview.pendingTotal,
    savingsGoalPercent: args.settings?.savingsGoalPercent ?? 0,
    wishProjections,
  })
  const overview = buildPlanningOverview({
    availableBalance,
    committedAmount: commitmentOverview.totalRemaining,
    monthlyCommitmentAverage,
    monthlyIncome,
    pendingSalaryAmount: salaryOverview.pendingTotal,
    reserveAmount,
    wishProjections,
  })
  const lastCalculatedAt = args.nowIso ?? new Date().toISOString()

  return {
    commitmentOverview,
    currentScoreInput: breakdown,
    currentScorePayload: {
      breakdown,
      userId: args.userId,
    },
    overview,
    salaryStabilityScore,
    wishProjectionSyncInputs: wishProjections.map((projection) => ({
      confidenceLevel: projection.confidenceLevel,
      confidenceReason: projection.confidenceReason,
      estimatedPurchaseDate: projection.estimatedPurchaseDate,
      lastCalculatedAt,
      wishId: projection.wish.id,
    })),
    wishProjections,
  } satisfies PlanningEvaluationResult
}
