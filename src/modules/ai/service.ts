import { supabase } from '@/lib/supabase/client'
import {
  buildDashboardHealthContext,
  buildWeeklyFinancialContext,
  buildWishAdviceContext,
} from '@/modules/ai/context-builder'
import { findLatestAiInsight } from '@/modules/ai/insights'
import {
  buildSimulationSnapshot,
  buildWishSimulationResults,
  type WishSimulationResult,
} from '@/modules/ai/simulation'
import type {
  BuildWeeklyFinancialContextArgs,
  BuildWishAdviceContextArgs,
  DashboardHealthOutput,
  EnqueueFinancialAiFunctionRequest,
  EnqueueFinancialAiFunctionResponse,
  FinancialAiFunctionRequest,
  FinancialAiFunctionResponse,
  SimulationOutput,
} from '@/modules/ai/types'
import type { FinancialScore } from '@/modules/insights/score'
import type { WishProjection } from '@/modules/wishes/calculations'
import type { Wish } from '@/modules/wishes/types'

function buildDashboardHealthFallback(args: {
  currentScore: FinancialScore
  overview: BuildWeeklyFinancialContextArgs['overview']
}): DashboardHealthOutput {
  const alerts: DashboardHealthOutput['alerts'] = []

  if (args.overview.assignableAmount <= 0) {
    alerts.push({
      body: 'Tus compromisos y reserva ya consumen todo el margen disponible.',
      id: 'liquidity_margin_low',
      route: '/(tabs)/planning',
      severity: 'high',
      title: 'Liquidez inmediata insuficiente',
    })
  }

  if (args.overview.pendingSalaryAmount > args.overview.monthlyIncome * 0.5) {
    alerts.push({
      body: 'Una parte importante de tu estabilidad actual depende de salario aun no cobrado.',
      id: 'pending_salary_pressure',
      route: '/(tabs)/dashboard',
      severity: 'medium',
      title: 'Alta dependencia de salario pendiente',
    })
  }

  if (args.currentScore.score < 60) {
    alerts.push({
      body: 'El score bajo sugiere priorizar pagos y evitar nuevas compras por ahora.',
      id: 'low_financial_score',
      route: '/insights',
      severity: 'high',
      title: 'Score financiero en zona fragil',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      body: 'Tu estado actual es estable, pero conviene mantener la reserva y no sobredimensionar nuevos deseos.',
      id: 'stable_state',
      route: '/insights',
      severity: 'low',
      title: 'Salud financiera bajo control',
    })
  }

  return {
    alerts: alerts.slice(0, 3),
    immediateAction:
      args.overview.assignableAmount > 0
        ? 'Mantener liquidez y cubrir compromisos cercanos antes de abrir nuevas compras.'
        : 'Recuperar margen libre antes de asignar dinero a nuevos deseos.',
    mainOpportunity:
      args.overview.totalWishEstimated > 0
        ? 'Puedes ordenar mejor la wishlist si proteges primero el dinero asignable.'
        : 'Sin presion fuerte de deseos, puedes consolidar reserva.',
    mainRisk:
      args.overview.pendingSalaryAmount > 0
        ? 'La estabilidad actual depende parcialmente de ingresos pendientes.'
        : 'Un desbalance entre compromisos y ahorro puede erosionar liquidez.',
    status: 'ok',
    summary:
      args.currentScore.score >= 70
        ? 'Tu salud financiera es estable, aunque conviene seguir priorizando liquidez y reserva.'
        : 'Tu salud financiera muestra fragilidad y requiere priorizar compromisos antes de comprar.',
    weeklyAction:
      'Revisa compromisos de la semana, evita compras no esenciales y actualiza tus deseos segun margen real.',
  }
}

function buildSimulationFallback(result: WishSimulationResult): SimulationOutput {
  const tradeoffA =
    result.delta.assignableAmount < 0
      ? 'Reduce tu margen asignable inmediato.'
      : 'Mejora o mantiene el margen asignable.'
  const tradeoffB =
    result.delta.financialScore < 0
      ? 'Empuja el score proyectado a una zona mas fragil.'
      : 'Mantiene o mejora el score proyectado.'

  return {
    recommendedAction:
      result.scenario === 'buy_now' && result.after.assignableAmount < 0
        ? 'Conviene esperar o consolidar liquidez antes de comprar.'
        : result.scenario === 'collect_pending_salary'
          ? 'Es el escenario mas sano si realmente esperas cobrar pronto.'
          : 'Puedes usar este escenario para ganar margen sin tocar la reserva.',
    status: 'ok',
    summary:
      result.scenario === 'buy_now'
        ? 'Comprar ahora muestra el impacto inmediato sobre liquidez y score.'
        : result.scenario === 'collect_pending_salary'
          ? 'Esperar al cobro mejora la liquidez sin forzar la reserva.'
          : 'Esperar dos semanas conserva tu posicion actual y gana tiempo para decidir.',
    tradeoffs: [tradeoffA, tradeoffB],
  }
}

async function invokeEnqueueFinancialAi(body: EnqueueFinancialAiFunctionRequest) {
  const { data, error } = await supabase.functions.invoke<EnqueueFinancialAiFunctionResponse>(
    'enqueue-financial-ai',
    {
      body,
    },
  )

  if (error) {
    throw error
  }

  return data
}

async function invokeFinancialAi(body: FinancialAiFunctionRequest) {
  const { data, error } = await supabase.functions.invoke<FinancialAiFunctionResponse>(
    'financial-ai',
    {
      body,
    },
  )

  if (error) {
    throw error
  }

  return data
}

function patchWishCollections(args: {
  wishProjections: WishProjection[]
  wishes: Wish[]
}) {
  return {
    wishProjections: args.wishProjections,
    wishes: args.wishes,
  }
}

async function enqueueJobs(body: EnqueueFinancialAiFunctionRequest) {
  if (body.jobs.length === 0) {
    return null
  }

  return invokeEnqueueFinancialAi(body)
}

export async function generateWeeklyFinancialTip(args: BuildWeeklyFinancialContextArgs & {
  userId: string
}) {
  if (args.settings.aiAnalysisFrequency === 'manual') {
    return args.currentScore
  }

  await enqueueJobs({
    jobs: [
      {
        scope: 'weekly_summary',
        snapshot: buildWeeklyFinancialContext(args.userId, args),
        triggerSource: args.analysisReason ?? 'planning_refresh',
      },
    ],
  })

  return args.currentScore
}

export async function generateWishAdviceBatch(args: Omit<BuildWishAdviceContextArgs, 'wishId'> & {
  currentScore: FinancialScore
  userId: string
  wishes: Wish[]
}) {
  if (args.settings.aiAnalysisFrequency === 'manual') {
    return patchWishCollections({
      wishProjections: args.wishProjections,
      wishes: args.wishes,
    })
  }

  const pendingProjections = args.wishProjections.filter((projection) => !projection.wish.isPurchased)

  await enqueueJobs({
    jobs: pendingProjections.map((projection) => ({
      scope: 'wish_advice' as const,
      scopeId: projection.wish.id,
      snapshot: buildWishAdviceContext(args.userId, {
        analysisReason: args.analysisReason,
        commitmentOverview: args.commitmentOverview,
        currentScore: args.currentScore,
        generatedAt: args.generatedAt,
        overview: args.overview,
        settings: args.settings,
        wishId: projection.wish.id,
        wishProjections: args.wishProjections,
      }),
      triggerSource: args.analysisReason ?? 'planning_refresh',
    })),
  })

  return patchWishCollections({
    wishProjections: args.wishProjections,
    wishes: args.wishes,
  })
}

export async function generateDashboardHealthSummary(args: BuildWeeklyFinancialContextArgs & {
  userId: string
}) {
  const fallbackOutput = buildDashboardHealthFallback({
    currentScore: args.currentScore,
    overview: args.overview,
  })

  if (args.settings.aiAnalysisFrequency !== 'manual') {
    await enqueueJobs({
      jobs: [
        {
          scope: 'dashboard_health',
          snapshot: buildDashboardHealthContext(args.userId, args),
          triggerSource: args.analysisReason ?? 'planning_refresh',
        },
      ],
    })
  }

  const latestInsight = await findLatestAiInsight({
    scope: 'dashboard_health',
    userId: args.userId,
  })

  if (latestInsight?.outputJson) {
    return latestInsight.outputJson as DashboardHealthOutput
  }

  return fallbackOutput
}

function extractSimulationOutput(response: FinancialAiFunctionResponse | null) {
  if (!response) {
    return null
  }

  return response.outputJson as SimulationOutput
}

export async function generateWishSimulationInsights(args: {
  currentScore: FinancialScore
  overview: BuildWishAdviceContextArgs['overview']
  userId: string
  wishProjection: WishProjection
}) {
  const scenarios = buildWishSimulationResults({
    currentScore: args.currentScore,
    overview: args.overview,
    userId: args.userId,
    wishProjection: args.wishProjection,
  })

  const enriched = await Promise.all(
    scenarios.map(async (result) => {
      const snapshot = buildSimulationSnapshot({
        currentScore: args.currentScore,
        overview: args.overview,
        scenario: result.scenario,
        userId: args.userId,
        wishProjection: args.wishProjection,
      })
      const fallbackOutput = buildSimulationFallback(result)

      try {
        const response = await invokeFinancialAi({
          scope: 'simulation',
          snapshot,
          userId: args.userId,
        })
        const output = extractSimulationOutput(response) ?? fallbackOutput

        return {
          ...result,
          interpretation: output,
        }
      } catch {
        return {
          ...result,
          interpretation: fallbackOutput,
        }
      }
    }),
  )

  return enriched
}
