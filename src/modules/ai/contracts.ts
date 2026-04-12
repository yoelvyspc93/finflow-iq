export type AiScope =
  | 'weekly_summary'
  | 'wish_advice'
  | 'dashboard_health'
  | 'simulation'

export type ActiveAiScope = Exclude<AiScope, 'simulation'>

export type AiInsightStatus = 'ok' | 'fallback'
export type AiAnalysisFrequency = 'each_transaction' | 'daily' | 'manual'
export type AiProvider = 'groq' | 'openai'
export type AiTrendDirection = 'up' | 'down' | 'stable'
export type AiPressureLevel = 'low' | 'medium' | 'high'

export type AiContextBase = {
  analysisReason: string
  generatedAt: string
  user: {
    id: string
    primaryCurrency: 'USD' | 'CUP'
  }
  version: 1
}

export type WishAdviceRelevantWish = {
  confidenceLevel: 'high' | 'medium' | 'low' | 'risky' | null
  confidenceReason: string | null
  estimatedAmount: number
  estimatedPurchaseDate: string | null
  id: string
  impactOnAssignableAmount: number
  isCompetingWithCommitments: boolean
  isShortTermViable: boolean
  name: string
  notes: string | null
  priority: number
}

export type WishAdviceComparableWish = Pick<
  WishAdviceRelevantWish,
  'estimatedAmount' | 'id' | 'name' | 'priority'
>

export type WeeklyFinancialContext = AiContextBase & {
  commitments: {
    activeProvisionCount: number
    activeRecurringCount: number
    monthlyCommitted: number
    monthlyPaid: number
    monthlyRemaining: number
  }
  scope: 'weekly_summary'
  settings: {
    aiAnalysisFrequency: AiAnalysisFrequency
    alertLevel: 'conservative' | 'normal' | 'aggressive'
    avgMonthsWithoutPayment: number
    salaryReferenceAmount: number | null
    savingsGoalPercent: number
    weeklySummaryDay:
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday'
  }
  salary: {
    lastPaymentDate: string | null
    monthlyIncomeEstimate: number
    monthsWithoutPayment: number
    pendingSalaryAmount: number
    totalAllocated: number
    totalReceived: number
  }
  summary: {
    assignableAmount: number
    availableBalance: number
    committedAmount: number
    financialScore: number
    monthlyCommitmentAverage: number
    monthlyIncome: number
    pendingSalaryAmount: number
    previousFinancialScore: number | null
    reserveAmount: number
    scoreDelta: number | null
    totalWishEstimated: number
  }
  trend: {
    balanceTrend: AiTrendDirection
    last4WeeksScores: number[]
    scoreTrend: AiTrendDirection
    wishlistPressureTrend: AiTrendDirection
  }
  wallets: {
    balance: number
    currency: string
    id: string
    isActive: boolean
    name: string
  }[]
  wishlist: {
    items: WishAdviceRelevantWish[]
    pressureLevel: AiPressureLevel
    totalActiveWishes: number
  }
}

export type WishAdviceContext = AiContextBase & {
  commitments: {
    monthlyCommitted: number
    monthlyRemaining: number
  }
  otherWishes: WishAdviceComparableWish[]
  scope: 'wish_advice'
  settings: {
    aiAnalysisFrequency: AiAnalysisFrequency
    avgMonthsWithoutPayment: number
    salaryReferenceAmount: number | null
    savingsGoalPercent: number
  }
  summary: {
    assignableAmount: number
    availableBalance: number
    committedAmount: number
    financialScore: number
    pendingSalaryAmount: number
    reserveAmount: number
  }
  wish: WishAdviceRelevantWish
}

export type DashboardHealthContext = Omit<WeeklyFinancialContext, 'scope'> & {
  scope: 'dashboard_health'
}

export type WeeklyInsightOutput = {
  actions: [string, string, string]
  mainOpportunity: string
  mainRisk: string
  shortTip: string
  status: 'ok'
  summary: string
  tone: 'stable' | 'cautious' | 'warning'
}

export type WishAdviceOutput = {
  conditionToBuy: string
  confidence: 'low' | 'medium' | 'high'
  decision: 'buy_now' | 'wait' | 'not_recommended'
  headline: string
  reason: string
  status: 'ok'
  urgency: 'low' | 'medium' | 'high'
}

export type DashboardHealthAlert = {
  id: string
  route: '/insights' | '/(tabs)/planning' | '/(tabs)/dashboard' | '/notifications'
  severity: 'low' | 'medium' | 'high'
  title: string
  body: string
}

export type DashboardHealthOutput = {
  alerts: DashboardHealthAlert[]
  immediateAction: string
  mainOpportunity: string
  mainRisk: string
  status: 'ok'
  summary: string
  weeklyAction: string
}

export type SimulationScenario = 'buy_now' | 'wait_two_weeks' | 'collect_pending_salary'

export type SimulationSnapshot = AiContextBase & {
  after: {
    assignableAmount: number
    availableBalance: number
    financialScore: number
    pendingSalaryAmount: number
    reserveAmount: number
  }
  before: {
    assignableAmount: number
    availableBalance: number
    financialScore: number
    pendingSalaryAmount: number
    reserveAmount: number
  }
  delta: {
    assignableAmount: number
    availableBalance: number
    financialScore: number
    pendingSalaryAmount: number
  }
  scenario: SimulationScenario
  scope: 'simulation'
  wish: {
    estimatedAmount: number
    id: string
    name: string
    priority: number
  }
}

export type SimulationOutput = {
  recommendedAction: string
  status: 'ok'
  summary: string
  tradeoffs: [string, string]
}

export type FinancialAiFunctionRequest =
  | {
      scope: 'simulation'
      snapshot: SimulationSnapshot
      userId: string
    }
  | {
      scope: 'dashboard_health'
      snapshot: DashboardHealthContext
      userId: string
    }
  | {
      scope: 'weekly_summary'
      snapshot: WeeklyFinancialContext
      userId: string
    }
  | {
      scope: 'wish_advice'
      snapshot: WishAdviceContext
      userId: string
    }

export type FinancialAiFunctionResponse = {
  createdAt: string
  model: string
  outputJson:
    | WeeklyInsightOutput
    | WishAdviceOutput
    | DashboardHealthOutput
    | SimulationOutput
  outputText: string
  promptVersion: string
  provider: AiProvider
  status: AiInsightStatus
  usage: {
    inputTokens: number | null
    outputTokens: number | null
  }
}

export type EnqueueFinancialAiJob =
  | {
      scope: 'weekly_summary'
      scopeId?: null
      snapshot: WeeklyFinancialContext
      triggerSource: string
    }
  | {
      scope: 'dashboard_health'
      scopeId?: null
      snapshot: DashboardHealthContext
      triggerSource: string
    }
  | {
      scope: 'wish_advice'
      scopeId: string
      snapshot: WishAdviceContext
      triggerSource: string
    }

export type EnqueueFinancialAiFunctionRequest = {
  jobs: EnqueueFinancialAiJob[]
}

export type EnqueueFinancialAiJobResult = {
  aiInsightId: string | null
  jobId: string | null
  scope: ActiveAiScope
  scopeId: string | null
  snapshotFingerprint: string
  status: 'queued' | 'reused'
}

export type EnqueueFinancialAiFunctionResponse = {
  jobs: EnqueueFinancialAiJobResult[]
}

export const ACTIVE_AI_SCOPES: ActiveAiScope[] = [
  'weekly_summary',
  'wish_advice',
  'dashboard_health',
]

export const PROMPT_VERSION: Record<AiScope, string> = {
  dashboard_health: 'dashboard_health.v2',
  simulation: 'simulation.v2',
  weekly_summary: 'weekly_summary.v2',
  wish_advice: 'wish_advice.v2',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAiAnalysisFrequency(value: unknown): value is AiAnalysisFrequency {
  return value === 'each_transaction' || value === 'daily' || value === 'manual'
}

function isAiTrendDirection(value: unknown): value is AiTrendDirection {
  return value === 'up' || value === 'down' || value === 'stable'
}

function isAiPressureLevel(value: unknown): value is AiPressureLevel {
  return value === 'low' || value === 'medium' || value === 'high'
}

function isWishAdviceRelevantWish(value: unknown): value is WishAdviceRelevantWish {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.estimatedAmount === 'number' &&
    typeof value.priority === 'number' &&
    typeof value.impactOnAssignableAmount === 'number' &&
    typeof value.isCompetingWithCommitments === 'boolean' &&
    typeof value.isShortTermViable === 'boolean'
  )
}

function isContextBase(value: unknown): value is AiContextBase {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.analysisReason === 'string' &&
    typeof value.generatedAt === 'string' &&
    isRecord(value.user) &&
    typeof value.user.id === 'string' &&
    (value.user.primaryCurrency === 'USD' || value.user.primaryCurrency === 'CUP')
  )
}

export function isAiScope(value: unknown): value is AiScope {
  return (
    value === 'weekly_summary' ||
    value === 'wish_advice' ||
    value === 'dashboard_health' ||
    value === 'simulation'
  )
}

export function isActiveAiScope(value: unknown): value is ActiveAiScope {
  return value === 'weekly_summary' || value === 'wish_advice' || value === 'dashboard_health'
}

export function isWeeklyFinancialContext(value: unknown): value is WeeklyFinancialContext {
  const snapshot = value as WeeklyFinancialContext

  return (
    isContextBase(value) &&
    snapshot.scope === 'weekly_summary' &&
    isRecord(snapshot.commitments) &&
    typeof snapshot.commitments.activeProvisionCount === 'number' &&
    typeof snapshot.commitments.activeRecurringCount === 'number' &&
    typeof snapshot.commitments.monthlyCommitted === 'number' &&
    typeof snapshot.commitments.monthlyPaid === 'number' &&
    typeof snapshot.commitments.monthlyRemaining === 'number' &&
    isRecord(snapshot.settings) &&
    isAiAnalysisFrequency(snapshot.settings.aiAnalysisFrequency) &&
    typeof snapshot.settings.avgMonthsWithoutPayment === 'number' &&
    typeof snapshot.settings.savingsGoalPercent === 'number' &&
    isRecord(snapshot.salary) &&
    typeof snapshot.salary.monthlyIncomeEstimate === 'number' &&
    typeof snapshot.salary.pendingSalaryAmount === 'number' &&
    isRecord(snapshot.summary) &&
    typeof snapshot.summary.financialScore === 'number' &&
    typeof snapshot.summary.assignableAmount === 'number' &&
    typeof snapshot.summary.monthlyIncome === 'number' &&
    typeof snapshot.summary.pendingSalaryAmount === 'number' &&
    Array.isArray(snapshot.wallets) &&
    snapshot.wallets.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.currency === 'string' &&
        typeof item.balance === 'number' &&
        typeof item.isActive === 'boolean',
    ) &&
    isRecord(snapshot.wishlist) &&
    typeof snapshot.wishlist.totalActiveWishes === 'number' &&
    isAiPressureLevel(snapshot.wishlist.pressureLevel) &&
    Array.isArray(snapshot.wishlist.items) &&
    snapshot.wishlist.items.every((item: unknown) => isWishAdviceRelevantWish(item)) &&
    isRecord(snapshot.trend) &&
    Array.isArray(snapshot.trend.last4WeeksScores) &&
    snapshot.trend.last4WeeksScores.every((item: unknown) => typeof item === 'number') &&
    isAiTrendDirection(snapshot.trend.balanceTrend) &&
    isAiTrendDirection(snapshot.trend.scoreTrend) &&
    isAiTrendDirection(snapshot.trend.wishlistPressureTrend)
  )
}

export function isWishAdviceContext(value: unknown): value is WishAdviceContext {
  const snapshot = value as WishAdviceContext

  return (
    isContextBase(value) &&
    snapshot.scope === 'wish_advice' &&
    isRecord(snapshot.commitments) &&
    typeof snapshot.commitments.monthlyCommitted === 'number' &&
    typeof snapshot.commitments.monthlyRemaining === 'number' &&
    isRecord(snapshot.settings) &&
    isAiAnalysisFrequency(snapshot.settings.aiAnalysisFrequency) &&
    typeof snapshot.settings.avgMonthsWithoutPayment === 'number' &&
    typeof snapshot.settings.savingsGoalPercent === 'number' &&
    isRecord(snapshot.summary) &&
    typeof snapshot.summary.financialScore === 'number' &&
    typeof snapshot.summary.assignableAmount === 'number' &&
    typeof snapshot.summary.pendingSalaryAmount === 'number' &&
    isWishAdviceRelevantWish(snapshot.wish) &&
    Array.isArray(snapshot.otherWishes) &&
    snapshot.otherWishes.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.estimatedAmount === 'number' &&
        typeof item.priority === 'number',
    )
  )
}

export function isDashboardHealthContext(value: unknown): value is DashboardHealthContext {
  return (
    isWeeklyFinancialContext({
      ...(isRecord(value) ? value : {}),
      scope: 'weekly_summary',
    }) && isRecord(value) && value.scope === 'dashboard_health'
  )
}

export function isSimulationSnapshot(value: unknown): value is SimulationSnapshot {
  const snapshot = value as SimulationSnapshot

  return (
    isContextBase(value) &&
    snapshot.scope === 'simulation' &&
    isRecord(snapshot.before) &&
    typeof snapshot.before.assignableAmount === 'number' &&
    typeof snapshot.before.availableBalance === 'number' &&
    typeof snapshot.before.financialScore === 'number' &&
    typeof snapshot.before.pendingSalaryAmount === 'number' &&
    typeof snapshot.before.reserveAmount === 'number' &&
    isRecord(snapshot.after) &&
    typeof snapshot.after.assignableAmount === 'number' &&
    typeof snapshot.after.availableBalance === 'number' &&
    typeof snapshot.after.financialScore === 'number' &&
    typeof snapshot.after.pendingSalaryAmount === 'number' &&
    typeof snapshot.after.reserveAmount === 'number' &&
    isRecord(snapshot.delta) &&
    typeof snapshot.delta.assignableAmount === 'number' &&
    typeof snapshot.delta.availableBalance === 'number' &&
    typeof snapshot.delta.financialScore === 'number' &&
    typeof snapshot.delta.pendingSalaryAmount === 'number' &&
    isRecord(snapshot.wish) &&
    typeof snapshot.wish.id === 'string' &&
    typeof snapshot.wish.name === 'string' &&
    typeof snapshot.wish.estimatedAmount === 'number' &&
    typeof snapshot.wish.priority === 'number'
  )
}

export function isWeeklyInsightOutput(value: unknown): value is WeeklyInsightOutput {
  return (
    isRecord(value) &&
    value.status === 'ok' &&
    typeof value.summary === 'string' &&
    typeof value.mainRisk === 'string' &&
    typeof value.mainOpportunity === 'string' &&
    Array.isArray(value.actions) &&
    value.actions.length === 3 &&
    value.actions.every((item) => typeof item === 'string') &&
    typeof value.shortTip === 'string' &&
    (value.tone === 'stable' || value.tone === 'cautious' || value.tone === 'warning')
  )
}

export function isWishAdviceOutput(value: unknown): value is WishAdviceOutput {
  return (
    isRecord(value) &&
    value.status === 'ok' &&
    typeof value.headline === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.conditionToBuy === 'string' &&
    (value.decision === 'buy_now' ||
      value.decision === 'wait' ||
      value.decision === 'not_recommended') &&
    (value.urgency === 'low' || value.urgency === 'medium' || value.urgency === 'high') &&
    (value.confidence === 'low' || value.confidence === 'medium' || value.confidence === 'high')
  )
}

export function isDashboardHealthOutput(value: unknown): value is DashboardHealthOutput {
  return (
    isRecord(value) &&
    value.status === 'ok' &&
    typeof value.summary === 'string' &&
    typeof value.mainRisk === 'string' &&
    typeof value.mainOpportunity === 'string' &&
    typeof value.immediateAction === 'string' &&
    typeof value.weeklyAction === 'string' &&
    Array.isArray(value.alerts) &&
    value.alerts.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.body === 'string' &&
        (item.route === '/insights' ||
          item.route === '/(tabs)/planning' ||
          item.route === '/(tabs)/dashboard' ||
          item.route === '/notifications') &&
        (item.severity === 'low' || item.severity === 'medium' || item.severity === 'high'),
    )
  )
}

export function isSimulationOutput(value: unknown): value is SimulationOutput {
  return (
    isRecord(value) &&
    value.status === 'ok' &&
    typeof value.summary === 'string' &&
    typeof value.recommendedAction === 'string' &&
    Array.isArray(value.tradeoffs) &&
    value.tradeoffs.length === 2 &&
    value.tradeoffs.every((item) => typeof item === 'string')
  )
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)

  return `{${entries.join(',')}}`
}

function sanitizeSnapshot(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSnapshot(item))
  }

  const record = value as Record<string, unknown>
  const sanitizedEntries = Object.entries(record)
    .filter(([key]) => key !== 'generatedAt')
    .map(([key, entryValue]) => [key, sanitizeSnapshot(entryValue)] as const)

  return Object.fromEntries(sanitizedEntries)
}

export function createSnapshotFingerprint(snapshot: unknown) {
  const serialized = stableSerialize(sanitizeSnapshot(snapshot))
  let hash = 5381

  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 33) ^ serialized.charCodeAt(index)
  }

  return `fp_${(hash >>> 0).toString(16)}`
}

export function getAiInsightTtlMs(scope: AiScope) {
  if (scope === 'weekly_summary') {
    return 7 * 24 * 60 * 60 * 1000
  }

  if (scope === 'dashboard_health') {
    return 24 * 60 * 60 * 1000
  }

  return 3 * 24 * 60 * 60 * 1000
}

export function getAiInsightExpiresAt(scope: AiScope, createdAt: string) {
  return new Date(new Date(createdAt).getTime() + getAiInsightTtlMs(scope)).toISOString()
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function readNumber(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  return typeof value === 'number' ? value : null
}

function readNestedNumber(
  record: Record<string, unknown> | null,
  key: string,
  nestedKey: string,
) {
  return readNumber(asRecord(record?.[key]), nestedKey)
}

function changedEnough(left: number | null, right: number | null, threshold: number) {
  if (left === null || right === null) {
    return true
  }

  return Math.abs(left - right) >= threshold
}

export function hasMaterialAiSnapshotChange(args: {
  nextSnapshot: unknown
  previousSnapshot: unknown
  scope: AiScope
}) {
  if (!args.previousSnapshot) {
    return true
  }

  const previous = asRecord(args.previousSnapshot)
  const next = asRecord(args.nextSnapshot)

  if (args.scope === 'weekly_summary' || args.scope === 'dashboard_health') {
    return (
      changedEnough(
        readNestedNumber(previous, 'summary', 'financialScore'),
        readNestedNumber(next, 'summary', 'financialScore'),
        5,
      ) ||
      changedEnough(
        readNestedNumber(previous, 'summary', 'assignableAmount'),
        readNestedNumber(next, 'summary', 'assignableAmount'),
        20,
      ) ||
      changedEnough(
        readNestedNumber(previous, 'summary', 'pendingSalaryAmount'),
        readNestedNumber(next, 'summary', 'pendingSalaryAmount'),
        20,
      ) ||
      changedEnough(
        readNestedNumber(previous, 'wishlist', 'totalActiveWishes'),
        readNestedNumber(next, 'wishlist', 'totalActiveWishes'),
        1,
      )
    )
  }

  if (args.scope === 'wish_advice') {
    return (
      changedEnough(
        readNestedNumber(previous, 'summary', 'financialScore'),
        readNestedNumber(next, 'summary', 'financialScore'),
        5,
      ) ||
      changedEnough(
        readNestedNumber(previous, 'summary', 'assignableAmount'),
        readNestedNumber(next, 'summary', 'assignableAmount'),
        20,
      ) ||
      changedEnough(
        readNestedNumber(previous, 'wish', 'estimatedAmount'),
        readNestedNumber(next, 'wish', 'estimatedAmount'),
        10,
      )
    )
  }

  return true
}

export function shouldQueueAiGeneration(args: {
  frequency: AiAnalysisFrequency
  isMaterialChange: boolean
  latestInsightCreatedAt?: string | null
  nowIso?: string
  scope: AiScope
}) {
  if (args.scope === 'simulation') {
    return true
  }

  if (args.frequency === 'manual') {
    return false
  }

  if (!args.isMaterialChange) {
    return false
  }

  if (args.frequency === 'daily' && args.latestInsightCreatedAt) {
    const now = new Date(args.nowIso ?? new Date().toISOString()).getTime()
    const latest = new Date(args.latestInsightCreatedAt).getTime()

    if (now - latest < 24 * 60 * 60 * 1000) {
      return false
    }
  }

  return true
}

export function getAiAnalysisFrequency(
  snapshot: WeeklyFinancialContext | WishAdviceContext | DashboardHealthContext,
) {
  return snapshot.settings.aiAnalysisFrequency
}

export function getFinancialAiOutputText(
  scope: AiScope,
  output:
    | WeeklyInsightOutput
    | WishAdviceOutput
    | DashboardHealthOutput
    | SimulationOutput,
) {
  if (scope === 'weekly_summary') {
    return (output as WeeklyInsightOutput).shortTip
  }

  if (scope === 'wish_advice') {
    return (output as WishAdviceOutput).headline
  }

  return (output as DashboardHealthOutput | SimulationOutput).summary
}
