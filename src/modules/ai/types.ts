import type { CommitmentOverview } from '@/modules/commitments/calculations'
import type { FinancialScore } from '@/modules/insights/score'
import type { PlanningOverview } from '@/modules/planning/orchestrator'
import type { SalaryOverview } from '@/modules/salary/calculations'
import type { AppSettings } from '@/modules/settings/types'
import type { Wallet } from '@/modules/wallets/types'
import type { WishProjection } from '@/modules/wishes/calculations'

export type {
  ActiveAiScope,
  AiAnalysisFrequency,
  AiContextBase,
  AiInsightStatus,
  AiPressureLevel,
  AiProvider,
  AiScope,
  AiTrendDirection,
  DashboardHealthAlert,
  DashboardHealthContext,
  DashboardHealthOutput,
  EnqueueFinancialAiFunctionRequest,
  EnqueueFinancialAiFunctionResponse,
  EnqueueFinancialAiJob,
  EnqueueFinancialAiJobResult,
  FinancialAiFunctionRequest,
  FinancialAiFunctionResponse,
  SimulationOutput,
  SimulationScenario,
  SimulationSnapshot,
  WeeklyFinancialContext,
  WeeklyInsightOutput,
  WishAdviceComparableWish,
  WishAdviceContext,
  WishAdviceOutput,
  WishAdviceRelevantWish,
} from '@/modules/ai/contracts'

export type BuildWeeklyFinancialContextArgs = {
  analysisReason?: string
  commitmentOverview: CommitmentOverview
  currentScore: FinancialScore
  generatedAt?: string
  overview: PlanningOverview
  recentScores: FinancialScore[]
  salaryOverview: SalaryOverview
  settings: AppSettings
  wallets: Wallet[]
  wishProjections: WishProjection[]
}

export type BuildWishAdviceContextArgs = {
  analysisReason?: string
  commitmentOverview: CommitmentOverview
  currentScore: FinancialScore
  generatedAt?: string
  overview: PlanningOverview
  settings: AppSettings
  wishId: string
  wishProjections: WishProjection[]
}
