import type { WishProjection } from '@/modules/wishes/calculations'

export type FinancialScoreBreakdown = {
  commitment_score: number
  liquidity_score: number
  salary_stability_score: number
  savings_score: number
  total_score: number
  wishlist_pressure_score: number
}

export type FinancialScoreInput = {
  assignableAmount: number
  availableBalance: number
  committedAmount: number
  monthlyCommitmentAverage: number
  monthlyIncome: number
  monthsWithoutPayment: number
  pendingSalaryAmount: number
  savingsGoalPercent: number
  wishProjections: WishProjection[]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function calculateSalaryStabilityScore(args: {
  monthlyIncome: number
  monthsWithoutPayment: number
  pendingSalaryAmount: number
}) {
  if (args.monthlyIncome <= 0 && args.pendingSalaryAmount <= 0) {
    return 60
  }

  const pendingRatio =
    args.monthlyIncome > 0
      ? clamp(args.pendingSalaryAmount / args.monthlyIncome, 0, 1)
      : 1

  return Math.round(
    clamp(100 - args.monthsWithoutPayment * 18 - pendingRatio * 25, 20, 100),
  )
}

export function calculateFinancialScore(
  input: FinancialScoreInput,
): FinancialScoreBreakdown {
  const freeBalance = Math.max(input.availableBalance - input.committedAmount, 0)
  const liquidityCoverageMonths =
    input.monthlyCommitmentAverage > 0
      ? freeBalance / input.monthlyCommitmentAverage
      : 3
  const commitmentRatio =
    input.availableBalance > 0
      ? clamp(input.committedAmount / input.availableBalance, 0, 1)
      : 1
  const targetMonthlySavings =
    input.monthlyIncome > 0
      ? input.monthlyIncome * (input.savingsGoalPercent / 100)
      : 0
  const actualMonthlySavings = Math.max(input.assignableAmount, 0)
  const topWishPressure = input.wishProjections
    .filter((projection) => !projection.wish.isPurchased)
    .slice(0, 3)
    .reduce((total, projection) => total + projection.wish.estimatedAmount, 0)
  const liquidityScore = Math.round(
    clamp((liquidityCoverageMonths / 3) * 100, 0, 100),
  )
  const commitmentScore = Math.round((1 - commitmentRatio) * 100)
  const savingsScore =
    targetMonthlySavings > 0
      ? Math.round(
          clamp(actualMonthlySavings / targetMonthlySavings, 0, 1) * 100,
        )
      : actualMonthlySavings > 0
        ? 80
        : 55
  const salaryStabilityScore = calculateSalaryStabilityScore({
    monthlyIncome: input.monthlyIncome,
    monthsWithoutPayment: input.monthsWithoutPayment,
    pendingSalaryAmount: input.pendingSalaryAmount,
  })
  const wishlistCoverage =
    topWishPressure > 0
      ? clamp(
          (Math.max(input.assignableAmount, 0) + targetMonthlySavings * 6) /
            topWishPressure,
          0,
          1,
        )
      : 1
  const wishlistPressureScore = Math.round(wishlistCoverage * 100)
  const totalScore = Math.round(
    liquidityScore * 0.3 +
      commitmentScore * 0.2 +
      savingsScore * 0.2 +
      salaryStabilityScore * 0.15 +
      wishlistPressureScore * 0.15,
  )

  return {
    commitment_score: commitmentScore,
    liquidity_score: liquidityScore,
    salary_stability_score: salaryStabilityScore,
    savings_score: savingsScore,
    total_score: totalScore,
    wishlist_pressure_score: wishlistPressureScore,
  }
}

export function getCurrentWeekStart(referenceDate?: string) {
  const base = referenceDate
    ? new Date(`${referenceDate}T00:00:00.000Z`)
    : new Date()
  const day = base.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  base.setUTCDate(base.getUTCDate() + diff)
  return base.toISOString().slice(0, 10)
}
