import type {
  SimulationScenario,
  SimulationSnapshot,
} from '@/modules/ai/types'
import type { FinancialScore } from '@/modules/insights/score'
import type { PlanningOverview } from '@/modules/planning/orchestrator'
import type { WishProjection } from '@/modules/wishes/calculations'

export type WishSimulationResult = {
  after: SimulationSnapshot['after']
  before: SimulationSnapshot['before']
  delta: SimulationSnapshot['delta']
  label: string
  scenario: SimulationScenario
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function projectScore(args: {
  availableBalanceAfter: number
  currentScore: number
  pendingSalaryAfter: number
  reserveAmount: number
  scenario: SimulationScenario
}) {
  let nextScore = args.currentScore

  if (args.availableBalanceAfter < 0) {
    nextScore -= 25
  } else if (args.availableBalanceAfter < args.reserveAmount) {
    nextScore -= 12
  }

  if (args.pendingSalaryAfter === 0 && args.scenario === 'collect_pending_salary') {
    nextScore += 8
  }

  if (args.scenario === 'wait_two_weeks') {
    nextScore += 3
  }

  return Math.round(clamp(nextScore, 0, 100))
}

export function buildSimulationSnapshot(args: {
  currentScore: FinancialScore
  generatedAt?: string
  overview: PlanningOverview
  scenario: SimulationScenario
  userId: string
  wishProjection: WishProjection
}): SimulationSnapshot {
  const generatedAt = args.generatedAt ?? new Date().toISOString()
  const cost = args.wishProjection.wish.estimatedAmount
  const before = {
    assignableAmount: args.overview.assignableAmount,
    availableBalance: args.overview.availableBalance,
    financialScore: args.currentScore.score,
    pendingSalaryAmount: args.overview.pendingSalaryAmount,
    reserveAmount: args.overview.reserveAmount,
  }

  let after = before

  if (args.scenario === 'buy_now') {
    after = {
      ...before,
      assignableAmount: before.assignableAmount - cost,
      availableBalance: before.availableBalance - cost,
      financialScore: projectScore({
        availableBalanceAfter: before.availableBalance - cost,
        currentScore: before.financialScore,
        pendingSalaryAfter: before.pendingSalaryAmount,
        reserveAmount: before.reserveAmount,
        scenario: args.scenario,
      }),
    }
  }

  if (args.scenario === 'wait_two_weeks') {
    after = {
      ...before,
      financialScore: projectScore({
        availableBalanceAfter: before.availableBalance,
        currentScore: before.financialScore,
        pendingSalaryAfter: before.pendingSalaryAmount,
        reserveAmount: before.reserveAmount,
        scenario: args.scenario,
      }),
    }
  }

  if (args.scenario === 'collect_pending_salary') {
    after = {
      ...before,
      assignableAmount: before.assignableAmount + before.pendingSalaryAmount,
      availableBalance: before.availableBalance + before.pendingSalaryAmount,
      financialScore: projectScore({
        availableBalanceAfter: before.availableBalance + before.pendingSalaryAmount,
        currentScore: before.financialScore,
        pendingSalaryAfter: 0,
        reserveAmount: before.reserveAmount,
        scenario: args.scenario,
      }),
      pendingSalaryAmount: 0,
    }
  }

  return {
    after,
    analysisReason: 'wish_simulation',
    before,
    delta: {
      assignableAmount: after.assignableAmount - before.assignableAmount,
      availableBalance: after.availableBalance - before.availableBalance,
      financialScore: after.financialScore - before.financialScore,
      pendingSalaryAmount: after.pendingSalaryAmount - before.pendingSalaryAmount,
    },
    generatedAt,
    scenario: args.scenario,
    scope: 'simulation',
    user: {
      id: args.userId,
      primaryCurrency: 'USD',
    },
    version: 1,
    wish: {
      estimatedAmount: args.wishProjection.wish.estimatedAmount,
      id: args.wishProjection.wish.id,
      name: args.wishProjection.wish.name,
      priority: args.wishProjection.wish.priority,
    },
  }
}

export function buildWishSimulationResults(args: {
  currentScore: FinancialScore
  overview: PlanningOverview
  userId: string
  wishProjection: WishProjection
}) {
  const scenarios: { label: string; scenario: SimulationScenario }[] = [
    { label: 'Comprar ahora', scenario: 'buy_now' },
    { label: 'Esperar 2 semanas', scenario: 'wait_two_weeks' },
    { label: 'Esperar al cobro', scenario: 'collect_pending_salary' },
  ]

  return scenarios.map<WishSimulationResult>(({ label, scenario }) => {
    const snapshot = buildSimulationSnapshot({
      currentScore: args.currentScore,
      overview: args.overview,
      scenario,
      userId: args.userId,
      wishProjection: args.wishProjection,
    })

    return {
      after: snapshot.after,
      before: snapshot.before,
      delta: snapshot.delta,
      label,
      scenario,
    }
  })
}
