import type {
  AiPressureLevel,
  AiTrendDirection,
  BuildWeeklyFinancialContextArgs,
  BuildWishAdviceContextArgs,
  DashboardHealthContext,
  WeeklyFinancialContext,
  WishAdviceComparableWish,
  WishAdviceContext,
  WishAdviceRelevantWish,
} from '@/modules/ai/types'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getTrendDirection(values: number[]): AiTrendDirection {
  if (values.length < 2) {
    return 'stable'
  }

  const first = values[0] ?? 0
  const last = values.at(-1) ?? 0
  const delta = last - first

  if (Math.abs(delta) < 3) {
    return 'stable'
  }

  return delta > 0 ? 'up' : 'down'
}

function getWishlistPressureLevel(assignableAmount: number, totalWishEstimated: number): AiPressureLevel {
  if (totalWishEstimated <= 0) {
    return 'low'
  }

  const coverage = assignableAmount > 0 ? assignableAmount / totalWishEstimated : 0

  if (coverage >= 0.6) {
    return 'low'
  }

  if (coverage >= 0.25) {
    return 'medium'
  }

  return 'high'
}

function mapWallets(args: BuildWeeklyFinancialContextArgs['wallets']) {
  return args.map((wallet) => ({
    balance: wallet.balance,
    currency: wallet.currency,
    id: wallet.id,
    isActive: wallet.isActive,
    name: wallet.name,
  }))
}

function mapWishProjectionToAdviceWish(args: {
  assignableAmount: number
  committedAmount: number
  projection: BuildWeeklyFinancialContextArgs['wishProjections'][number]
  reserveAmount: number
}): WishAdviceRelevantWish {
  const { projection } = args
  const impactOnAssignableAmount = args.assignableAmount - projection.wish.estimatedAmount
  const isShortTermViable =
    !projection.wish.isPurchased &&
    projection.confidenceLevel !== 'risky' &&
    impactOnAssignableAmount >= 0
  const isCompetingWithCommitments =
    projection.wish.estimatedAmount > args.assignableAmount ||
    args.committedAmount > Math.max(args.reserveAmount, 0)

  return {
    confidenceLevel: projection.confidenceLevel,
    confidenceReason: projection.confidenceReason,
    estimatedAmount: projection.wish.estimatedAmount,
    estimatedPurchaseDate: projection.estimatedPurchaseDate,
    id: projection.wish.id,
    impactOnAssignableAmount,
    isCompetingWithCommitments,
    isShortTermViable,
    name: projection.wish.name,
    notes: projection.wish.notes,
    priority: projection.wish.priority,
  }
}

function buildContextBase(args: {
  analysisReason: string
  generatedAt: string
  primaryCurrency: BuildWeeklyFinancialContextArgs['settings']['primaryCurrency']
  userId: string
}) {
  return {
    analysisReason: args.analysisReason,
    generatedAt: args.generatedAt,
    user: {
      id: args.userId,
      primaryCurrency: args.primaryCurrency,
    },
    version: 1 as const,
  }
}

export function buildWeeklyFinancialContext(
  userId: string,
  args: BuildWeeklyFinancialContextArgs,
): WeeklyFinancialContext {
  const generatedAt = args.generatedAt ?? new Date().toISOString()
  const recentScores = [args.currentScore, ...args.recentScores]
    .filter((score, index, collection) => collection.findIndex((item) => item.weekStart === score.weekStart) === index)
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart))
    .slice(-4)
  const previousScore = recentScores.length > 1 ? recentScores.at(-2)?.score ?? null : null
  const activeWishProjections = args.wishProjections.filter((projection) => !projection.wish.isPurchased)
  const last4WeeksScores = recentScores.map((score) => score.score)
  const last4WeeksWishPressure = recentScores.map(
    (score) => score.breakdown.wishlist_pressure_score,
  )

  return {
    ...buildContextBase({
      analysisReason: args.analysisReason ?? 'planning_refresh',
      generatedAt,
      primaryCurrency: args.settings.primaryCurrency,
      userId,
    }),
    commitments: {
      activeProvisionCount: args.commitmentOverview.provisions.filter((item) => item.appliesToMonth).length,
      activeRecurringCount: args.commitmentOverview.recurringExpenses.filter((item) => item.appliesToMonth).length,
      monthlyCommitted: args.commitmentOverview.totalCommitted,
      monthlyPaid: args.commitmentOverview.totalPaid,
      monthlyRemaining: args.commitmentOverview.totalRemaining,
    },
    scope: 'weekly_summary',
    settings: {
      aiAnalysisFrequency: args.settings.aiAnalysisFrequency,
      alertLevel: args.settings.alertLevel,
      avgMonthsWithoutPayment: args.settings.avgMonthsWithoutPayment,
      salaryReferenceAmount: args.settings.salaryReferenceAmount,
      savingsGoalPercent: args.settings.savingsGoalPercent,
      weeklySummaryDay: args.settings.weeklySummaryDay,
    },
    salary: {
      lastPaymentDate: args.salaryOverview.lastPaymentDate,
      monthlyIncomeEstimate: args.overview.monthlyIncome,
      monthsWithoutPayment: args.salaryOverview.monthsWithoutPayment,
      pendingSalaryAmount: args.salaryOverview.pendingTotal,
      totalAllocated: args.salaryOverview.totalAllocated,
      totalReceived: args.salaryOverview.totalReceived,
    },
    summary: {
      assignableAmount: args.overview.assignableAmount,
      availableBalance: args.overview.availableBalance,
      committedAmount: args.overview.committedAmount,
      financialScore: args.currentScore.score,
      monthlyCommitmentAverage: args.overview.monthlyCommitmentAverage,
      monthlyIncome: args.overview.monthlyIncome,
      pendingSalaryAmount: args.overview.pendingSalaryAmount,
      previousFinancialScore: previousScore,
      reserveAmount: args.overview.reserveAmount,
      scoreDelta: previousScore === null ? null : args.currentScore.score - previousScore,
      totalWishEstimated: args.overview.totalWishEstimated,
    },
    trend: {
      balanceTrend: getTrendDirection([
        Math.round(
          clamp(
            args.overview.availableBalance - args.overview.committedAmount,
            0,
            Number.MAX_SAFE_INTEGER,
          ),
        ),
        Math.round(
          clamp(
            args.overview.availableBalance -
              args.overview.committedAmount +
              (args.currentScore.score - (previousScore ?? args.currentScore.score)),
            0,
            Number.MAX_SAFE_INTEGER,
          ),
        ),
      ]),
      last4WeeksScores,
      scoreTrend: getTrendDirection(last4WeeksScores),
      wishlistPressureTrend: getTrendDirection(last4WeeksWishPressure),
    },
    wallets: mapWallets(args.wallets),
    wishlist: {
      items: activeWishProjections.map((projection) =>
        mapWishProjectionToAdviceWish({
          assignableAmount: args.overview.assignableAmount,
          committedAmount: args.overview.committedAmount,
          projection,
          reserveAmount: args.overview.reserveAmount,
        }),
      ),
      pressureLevel: getWishlistPressureLevel(
        args.overview.assignableAmount,
        args.overview.totalWishEstimated,
      ),
      totalActiveWishes: activeWishProjections.length,
    },
  }
}

export function buildWishAdviceContext(
  userId: string,
  args: BuildWishAdviceContextArgs,
): WishAdviceContext {
  const generatedAt = args.generatedAt ?? new Date().toISOString()
  const projection = args.wishProjections.find((item) => item.wish.id === args.wishId)

  if (!projection) {
    throw new Error(`Wish projection not found for wish "${args.wishId}".`)
  }

  const wish = mapWishProjectionToAdviceWish({
    assignableAmount: args.overview.assignableAmount,
    committedAmount: args.overview.committedAmount,
    projection,
    reserveAmount: args.overview.reserveAmount,
  })
  const otherWishes: WishAdviceComparableWish[] = args.wishProjections
    .filter((item) => !item.wish.isPurchased && item.wish.id !== args.wishId)
    .sort((left, right) => left.wish.priority - right.wish.priority)
    .slice(0, 3)
    .map((item) => ({
      estimatedAmount: item.wish.estimatedAmount,
      id: item.wish.id,
      name: item.wish.name,
      priority: item.wish.priority,
    }))

  return {
    ...buildContextBase({
      analysisReason: args.analysisReason ?? 'wish_projection_refresh',
      generatedAt,
      primaryCurrency: args.settings.primaryCurrency,
      userId,
    }),
    commitments: {
      monthlyCommitted: args.commitmentOverview.totalCommitted,
      monthlyRemaining: args.commitmentOverview.totalRemaining,
    },
    otherWishes,
    scope: 'wish_advice',
    settings: {
      aiAnalysisFrequency: args.settings.aiAnalysisFrequency,
      avgMonthsWithoutPayment: args.settings.avgMonthsWithoutPayment,
      salaryReferenceAmount: args.settings.salaryReferenceAmount,
      savingsGoalPercent: args.settings.savingsGoalPercent,
    },
    summary: {
      assignableAmount: args.overview.assignableAmount,
      availableBalance: args.overview.availableBalance,
      committedAmount: args.overview.committedAmount,
      financialScore: args.currentScore.score,
      pendingSalaryAmount: args.overview.pendingSalaryAmount,
      reserveAmount: args.overview.reserveAmount,
    },
    wish,
  }
}

export function buildDashboardHealthContext(
  userId: string,
  args: BuildWeeklyFinancialContextArgs,
): DashboardHealthContext {
  return {
    ...buildWeeklyFinancialContext(userId, {
      ...args,
      analysisReason: args.analysisReason ?? 'dashboard_health_refresh',
    }),
    scope: 'dashboard_health',
  }
}
