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
import type { SalaryOverview } from '@/modules/salary/calculations'

export type FinancialMetricScope = 'portfolio' | 'wallet'

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
  salaryOverview: SalaryOverview
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

export function getScopedWallets(args: {
  scope: FinancialMetricScope
  selectedWalletId?: string | null
  wallets: Wallet[]
}) {
  const activeWallets = args.wallets.filter((wallet) => wallet.isActive)

  if (args.scope === 'wallet') {
    return activeWallets.filter((wallet) => wallet.id === args.selectedWalletId)
  }

  return activeWallets
}

export function getScopedRecurringExpenses(args: {
  recurringExpenses: RecurringExpense[]
  scope: FinancialMetricScope
  selectedWalletId?: string | null
}) {
  if (args.scope === 'wallet') {
    return args.recurringExpenses.filter(
      (expense) => expense.walletId === args.selectedWalletId,
    )
  }

  return args.recurringExpenses
}

export function getScopedWishes(args: {
  scope: FinancialMetricScope
  selectedWalletId?: string | null
  wishes: Wish[]
}) {
  if (args.scope === 'wallet') {
    return args.wishes.filter((wish) => wish.walletId === args.selectedWalletId)
  }

  return args.wishes
}

export function calculateReserveAmount(args: {
  monthlyCommitmentAverage: number
  monthsWithoutPayment: number
  savingsGoalPercent: number
}) {
  return (
    args.monthsWithoutPayment *
    args.monthlyCommitmentAverage *
    (1 + args.savingsGoalPercent / 100)
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

export function buildFinancialSnapshot(args: {
  availableBalance: number
  committedAmount: number
  monthlyCommitmentAverage: number
  monthlyIncome: number
  monthsWithoutPayment: number
  pendingSalaryAmount: number
  savingsGoalPercent: number
  wishProjections: WishProjection[]
}) {
  const reserveAmount = calculateReserveAmount({
    monthlyCommitmentAverage: args.monthlyCommitmentAverage,
    monthsWithoutPayment: args.monthsWithoutPayment,
    savingsGoalPercent: args.savingsGoalPercent,
  })
  const assignableAmount =
    args.availableBalance - args.committedAmount - reserveAmount
  const breakdown = calculateFinancialScore({
    assignableAmount,
    availableBalance: args.availableBalance,
    committedAmount: args.committedAmount,
    monthlyCommitmentAverage: args.monthlyCommitmentAverage,
    monthlyIncome: args.monthlyIncome,
    monthsWithoutPayment: args.monthsWithoutPayment,
    pendingSalaryAmount: args.pendingSalaryAmount,
    savingsGoalPercent: args.savingsGoalPercent,
    wishProjections: args.wishProjections,
  })
  const overview = buildPlanningOverview({
    availableBalance: args.availableBalance,
    committedAmount: args.committedAmount,
    monthlyCommitmentAverage: args.monthlyCommitmentAverage,
    monthlyIncome: args.monthlyIncome,
    pendingSalaryAmount: args.pendingSalaryAmount,
    reserveAmount,
    wishProjections: args.wishProjections,
  })

  return {
    assignableAmount,
    breakdown,
    overview,
    reserveAmount,
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
  scope?: FinancialMetricScope
  selectedWalletId?: string | null
  settings: AppSettings | null
  userId: string
  wallets: Wallet[]
  wishes: Wish[]
}) {
  const scope = args.scope ?? 'portfolio'
  const scopedWalletId =
    scope === 'wallet' ? args.selectedWalletId ?? '__missing_wallet__' : null
  const scopedWallets = getScopedWallets({
    scope,
    selectedWalletId: args.selectedWalletId,
    wallets: args.wallets,
  })
  const scopedRecurringExpenses = getScopedRecurringExpenses({
    recurringExpenses: args.recurringExpenses,
    scope,
    selectedWalletId: args.selectedWalletId,
  })
  const scopedWishes = getScopedWishes({
    scope,
    selectedWalletId: args.selectedWalletId,
    wishes: args.wishes,
  })
  const salaryOverview = calculateSalaryOverview(
    args.salaryPeriods,
    args.salaryPayments,
  )
  const commitmentOverview = calculateCommitmentOverview({
    budgetProvisions: args.budgetProvisions,
    month: args.currentMonth,
    paymentEntries: args.paymentEntries,
    recurringExpenses: args.recurringExpenses,
    walletId: scopedWalletId,
  })
  const availableBalance = scopedWallets.reduce(
    (total, wallet) => total + wallet.balance,
    0,
  )
  const monthlyCommitmentAverage = averageMonthlyCommitments(scopedRecurringExpenses)
  const monthlyIncome = averageMonthlyIncome({
    fallback: args.settings?.salaryReferenceAmount ?? null,
    payments: args.salaryPayments,
  })
  const reserveAmount = calculateReserveAmount({
    monthlyCommitmentAverage,
    monthsWithoutPayment: args.settings?.avgMonthsWithoutPayment ?? 0,
    savingsGoalPercent: args.settings?.savingsGoalPercent ?? 0,
  })
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
    wishes: scopedWishes,
  })
  const snapshot = buildFinancialSnapshot({
    availableBalance,
    committedAmount: commitmentOverview.totalRemaining,
    monthlyCommitmentAverage,
    monthlyIncome,
    monthsWithoutPayment: salaryOverview.monthsWithoutPayment,
    pendingSalaryAmount: salaryOverview.pendingTotal,
    savingsGoalPercent: args.settings?.savingsGoalPercent ?? 0,
    wishProjections,
  })
  const lastCalculatedAt = args.nowIso ?? new Date().toISOString()

  return {
    commitmentOverview,
    currentScoreInput: snapshot.breakdown,
    currentScorePayload: {
      breakdown: snapshot.breakdown,
      userId: args.userId,
    },
    overview: snapshot.overview,
    salaryOverview,
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
