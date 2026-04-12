// @ts-nocheck

import {
  PROMPT_VERSION,
  getFinancialAiOutputText,
  isDashboardHealthOutput,
  isSimulationOutput,
  isWeeklyInsightOutput,
  isWishAdviceOutput,
  type AiProvider,
  type AiScope,
  type DashboardHealthContext,
  type DashboardHealthOutput,
  type FinancialAiFunctionResponse,
  type SimulationOutput,
  type SimulationSnapshot,
  type WeeklyFinancialContext,
  type WeeklyInsightOutput,
  type WishAdviceContext,
  type WishAdviceOutput,
} from '../../../src/modules/ai/contracts.ts'

type ScopeSnapshot =
  | WeeklyFinancialContext
  | WishAdviceContext
  | DashboardHealthContext
  | SimulationSnapshot

type ProviderExecutionResult = {
  model: string
  outputJson: unknown
  provider: AiProvider
  usage: {
    inputTokens: number | null
    outputTokens: number | null
  }
}

type ScopeModelProfile = {
  model: string
  provider: AiProvider
}

function asTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asRecord(value: unknown) {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function getPromptVersion(scope: AiScope) {
  return PROMPT_VERSION[scope]
}

function buildWeeklyFallback(snapshot: WeeklyFinancialContext): WeeklyInsightOutput {
  const scoreDelta =
    snapshot.summary.previousFinancialScore === null
      ? null
      : snapshot.summary.financialScore - snapshot.summary.previousFinancialScore
  const tone: WeeklyInsightOutput['tone'] =
    snapshot.summary.financialScore >= 75
      ? 'stable'
      : snapshot.summary.financialScore >= 55
        ? 'cautious'
        : 'warning'
  const risk =
    snapshot.summary.assignableAmount <= 0
      ? 'Tu margen libre ya no cubre compras o imprevistos sin tensionar liquidez.'
      : snapshot.summary.assignableAmount < snapshot.summary.reserveAmount
        ? 'Tu margen asignable sigue por debajo de la reserva calculada.'
        : 'La principal fragilidad esta en sostener liquidez mientras cumples compromisos.'
  const opportunity =
    snapshot.wishlist.pressureLevel === 'low'
      ? 'Tus deseos actuales todavia no presionan demasiado el flujo disponible.'
      : 'Puedes recuperar control si priorizas compromisos y limitas compras no esenciales.'

  return {
    actions: [
      'Prioriza los compromisos del periodo antes de asignar dinero a deseos.',
      'No cuentes salario pendiente como liquidez inmediata.',
      'Protege la reserva minima hasta confirmar el siguiente ingreso.',
    ],
    mainOpportunity: opportunity,
    mainRisk: risk,
    shortTip:
      snapshot.summary.assignableAmount > 0
        ? 'Esta semana conserva liquidez antes de abrir nuevas compras.'
        : 'Esta semana evita compras no esenciales y recupera margen.',
    status: 'ok',
    summary:
      scoreDelta !== null && scoreDelta < 0
        ? 'Tu salud financiera bajo respecto a la semana anterior y conviene priorizar liquidez.'
        : 'Tu salud financiera es funcional, pero depende de mantener control sobre compromisos y reserva.',
    tone,
  }
}

function buildWishFallback(snapshot: WishAdviceContext): WishAdviceOutput {
  const canBuyNow =
    snapshot.wish.isShortTermViable &&
    snapshot.wish.impactOnAssignableAmount >= 0 &&
    snapshot.summary.assignableAmount > snapshot.summary.reserveAmount * 0.25

  if (canBuyNow) {
    return {
      conditionToBuy: 'Manten intacta la reserva minima despues de registrar la compra.',
      confidence: 'medium',
      decision: 'buy_now',
      headline: 'La compra parece razonable si mantienes la reserva.',
      reason:
        'El deseo cabe dentro del margen asignable actual y no muestra conflicto fuerte con los compromisos del periodo.',
      status: 'ok',
      urgency: 'low',
    }
  }

  return {
    conditionToBuy:
      'Es razonable comprar cuando el monto asignable cubra el deseo sin depender del salario pendiente.',
    confidence: snapshot.summary.pendingSalaryAmount > 0 ? 'high' : 'medium',
    decision: snapshot.wish.isCompetingWithCommitments ? 'not_recommended' : 'wait',
    headline: 'Conviene esperar antes de comprar este deseo.',
    reason:
      snapshot.summary.pendingSalaryAmount > 0
        ? 'La viabilidad actual depende de ingreso pendiente y eso no debe contarse como liquidez real.'
        : 'Hoy el deseo compite con compromisos y reduce demasiado el margen disponible.',
    status: 'ok',
    urgency: snapshot.wish.isCompetingWithCommitments ? 'high' : 'medium',
  }
}

function buildDashboardHealthFallback(
  snapshot: DashboardHealthContext,
): DashboardHealthOutput {
  const alerts: DashboardHealthOutput['alerts'] = []

  if (snapshot.summary.assignableAmount <= 0) {
    alerts.push({
      body: 'Los compromisos y la reserva ya consumen el margen disponible.',
      id: 'liquidity_margin_low',
      route: '/(tabs)/planning',
      severity: 'high',
      title: 'Liquidez inmediata insuficiente',
    })
  }

  if (snapshot.summary.pendingSalaryAmount > snapshot.summary.monthlyIncome * 0.5) {
    alerts.push({
      body: 'La estabilidad actual depende en buena medida de salario pendiente.',
      id: 'pending_salary_pressure',
      route: '/(tabs)/dashboard',
      severity: 'medium',
      title: 'Dependencia alta de salario pendiente',
    })
  }

  if (
    (snapshot.summary.previousFinancialScore ?? snapshot.summary.financialScore) >
    snapshot.summary.financialScore
  ) {
    alerts.push({
      body: 'El score retrocedio respecto a la ultima referencia disponible.',
      id: 'score_declining',
      route: '/insights',
      severity: 'medium',
      title: 'Tendencia de score a la baja',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      body: 'La situacion actual es estable, aunque conviene sostener reserva y liquidez.',
      id: 'stable_state',
      route: '/insights',
      severity: 'low',
      title: 'Salud financiera estable',
    })
  }

  return {
    alerts: alerts.slice(0, 3),
    immediateAction:
      snapshot.summary.assignableAmount > 0
        ? 'Cubre primero compromisos cercanos y manten la reserva.'
        : 'Recupera margen libre antes de abrir nuevas compras.',
    mainOpportunity:
      snapshot.wishlist.pressureLevel === 'low'
        ? 'La presion de deseos sigue controlada.'
        : 'Puedes recuperar control si priorizas liquidez esta semana.',
    mainRisk:
      snapshot.summary.pendingSalaryAmount > 0
        ? 'Parte de la estabilidad depende de ingreso pendiente.'
        : 'Una compra mal priorizada puede romper el margen actual.',
    status: 'ok',
    summary:
      snapshot.summary.financialScore >= 70
        ? 'Tu salud financiera es razonablemente estable, pero conviene seguir cuidando liquidez y reserva.'
        : 'Tu salud financiera muestra fragilidad y conviene actuar con cautela esta semana.',
    weeklyAction:
      'Evita compras no esenciales, revisa compromisos y reordena deseos segun margen real.',
  }
}

function buildSimulationFallback(snapshot: SimulationSnapshot): SimulationOutput {
  return {
    recommendedAction:
      snapshot.scenario === 'buy_now' && snapshot.after.assignableAmount < 0
        ? 'Conviene esperar antes de comprar para no romper tu margen asignable.'
        : snapshot.scenario === 'collect_pending_salary'
          ? 'Este escenario es mas sano si realmente esperas cobrar pronto.'
          : 'Esperar te da tiempo para decidir sin deteriorar tu posicion actual.',
    status: 'ok',
    summary:
      snapshot.scenario === 'buy_now'
        ? 'Comprar ahora muestra el impacto inmediato sobre liquidez y score.'
        : snapshot.scenario === 'collect_pending_salary'
          ? 'Esperar al cobro mejora liquidez y reduce dependencia de ingreso pendiente.'
          : 'Esperar dos semanas conserva tu posicion actual y evita forzar la reserva.',
    tradeoffs: [
      snapshot.delta.assignableAmount < 0
        ? 'Reduce tu margen asignable.'
        : 'Mantiene o mejora tu margen asignable.',
      snapshot.delta.financialScore < 0
        ? 'Empuja el score proyectado hacia abajo.'
        : 'Mantiene o mejora el score proyectado.',
    ],
  }
}

function getOutputContractInstructions(scope: AiScope) {
  if (scope === 'simulation') {
    return [
      'Responde exactamente con un objeto JSON que tenga solo estas claves:',
      '{"recommendedAction":"string","status":"ok","summary":"string","tradeoffs":["string","string"]}',
      'tradeoffs debe contener exactamente 2 elementos string.',
      'No agregues otras claves.',
    ].join('\n')
  }

  if (scope === 'dashboard_health') {
    return [
      'Responde exactamente con un objeto JSON que tenga solo estas claves:',
      '{"alerts":[{"id":"string","route":"/insights|/(tabs)/planning|/(tabs)/dashboard|/notifications","severity":"low|medium|high","title":"string","body":"string"}],"immediateAction":"string","mainOpportunity":"string","mainRisk":"string","status":"ok","summary":"string","weeklyAction":"string"}',
      'alerts debe tener entre 1 y 3 elementos.',
      'No devuelvas metricas, scores, montos ni recomendaciones fuera de esas claves.',
      'No agregues otras claves.',
    ].join('\n')
  }

  if (scope === 'weekly_summary') {
    return [
      'Responde exactamente con un objeto JSON que tenga solo estas claves:',
      '{"actions":["string","string","string"],"mainOpportunity":"string","mainRisk":"string","shortTip":"string","status":"ok","summary":"string","tone":"stable|cautious|warning"}',
      'actions debe contener exactamente 3 elementos string.',
      'No agregues otras claves.',
    ].join('\n')
  }

  return [
    'Responde exactamente con un objeto JSON que tenga solo estas claves:',
    '{"conditionToBuy":"string","confidence":"low|medium|high","decision":"buy_now|wait|not_recommended","headline":"string","reason":"string","status":"ok","urgency":"low|medium|high"}',
    'No agregues otras claves.',
  ].join('\n')
}

function buildPrompt(scope: AiScope, snapshot: ScopeSnapshot) {
  const promptVersion = getPromptVersion(scope)
  const contractInstructions = getOutputContractInstructions(scope)

  if (scope === 'simulation') {
    return [
      'Actua como un analista financiero personal y explica el resultado de una simulacion determinista.',
      'Responde siempre en espanol neutro.',
      'No recalcules cifras. Usa solo el before/after recibido.',
      'Devuelve JSON valido con la estructura SimulationOutput.',
      contractInstructions,
      `Prompt version: ${promptVersion}`,
      `Snapshot: ${JSON.stringify(snapshot)}`,
    ].join('\n')
  }

  if (scope === 'dashboard_health') {
    return [
      'Actua como un analista financiero personal y resume la salud financiera actual.',
      'Responde siempre en espanol neutro.',
      'No recalcules balances ni score. Usa solo el snapshot recibido.',
      'Devuelve JSON valido con la estructura DashboardHealthOutput.',
      contractInstructions,
      `Prompt version: ${promptVersion}`,
      `Snapshot: ${JSON.stringify(snapshot)}`,
    ].join('\n')
  }

  if (scope === 'weekly_summary') {
    return [
      'Actua como un analista financiero personal dentro de una app movil.',
      'Responde siempre en espanol neutro.',
      'No recalcules balances. Interpreta solo el snapshot recibido.',
      'No inventes cifras. No trates salario pendiente como dinero liquido.',
      'Devuelve JSON valido con la estructura WeeklyInsightOutput.',
      contractInstructions,
      `Prompt version: ${promptVersion}`,
      `Snapshot: ${JSON.stringify(snapshot)}`,
    ].join('\n')
  }

  return [
    'Actua como un analista financiero personal especializado en decisiones de compra.',
    'Responde siempre en espanol neutro.',
    'No recalcules score ni balances. Usa solo el snapshot recibido.',
    'No recomiendes comprar si compromete la reserva o depende de ingreso pendiente.',
    'Devuelve JSON valido con la estructura WishAdviceOutput.',
    contractInstructions,
    `Prompt version: ${promptVersion}`,
    `Snapshot: ${JSON.stringify(snapshot)}`,
  ].join('\n')
}

function parseScopeModelMap() {
  const raw = Deno.env.get('AI_SCOPE_MODEL_MAP')

  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed
  } catch {
    return {}
  }
}

function resolveScopeModelProfile(scope: AiScope): ScopeModelProfile {
  const defaultProvider = (Deno.env.get('AI_DEFAULT_PROVIDER') ?? 'groq') as AiProvider
  const defaultModel = Deno.env.get('AI_MODEL') ?? 'fallback-only'
  const scopeMap = parseScopeModelMap()
  const scopeConfig = scopeMap[scope]

  if (typeof scopeConfig === 'string') {
    return {
      model: scopeConfig,
      provider: defaultProvider,
    }
  }

  if (
    scopeConfig &&
    typeof scopeConfig === 'object' &&
    'model' in scopeConfig &&
    typeof scopeConfig.model === 'string'
  ) {
    const provider =
      'provider' in scopeConfig &&
      (scopeConfig.provider === 'groq' || scopeConfig.provider === 'openai')
        ? scopeConfig.provider
        : defaultProvider

    return {
      model: scopeConfig.model,
      provider,
    }
  }

  return {
    model: defaultModel,
    provider: defaultProvider,
  }
}

function getProviderConfig(provider: AiProvider) {
  if (provider === 'openai') {
    return {
      apiKey: Deno.env.get('OPENAI_API_KEY'),
      baseUrl: Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
    }
  }

  return {
    apiKey: Deno.env.get('GROQ_API_KEY'),
    baseUrl: Deno.env.get('GROQ_BASE_URL') ?? 'https://api.groq.com/openai/v1',
  }
}

async function executeProvider(args: {
  model: string
  prompt: string
  provider: AiProvider
}): Promise<ProviderExecutionResult> {
  const providerConfig = getProviderConfig(args.provider)

  if (!providerConfig.apiKey || !args.model || args.model === 'fallback-only') {
    throw new Error(`Provider ${args.provider} is not configured.`)
  }

  const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: 'Eres un analista financiero personal. Responde solamente con JSON valido.',
          role: 'system',
        },
        {
          content: args.prompt,
          role: 'user',
        },
      ],
      model: args.model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
    headers: {
      Authorization: `Bearer ${providerConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`AI provider request failed with status ${response.status}.`)
  }

  const payload = await response.json()
  const textContent = payload?.choices?.[0]?.message?.content

  if (typeof textContent !== 'string') {
    throw new Error('AI provider returned no message content.')
  }

  return {
    model: args.model,
    outputJson: JSON.parse(textContent),
    provider: args.provider,
    usage: {
      inputTokens: typeof payload?.usage?.prompt_tokens === 'number' ? payload.usage.prompt_tokens : null,
      outputTokens:
        typeof payload?.usage?.completion_tokens === 'number'
          ? payload.usage.completion_tokens
          : null,
    },
  }
}

function buildFallback(scope: AiScope, snapshot: ScopeSnapshot) {
  if (scope === 'weekly_summary') {
    return buildWeeklyFallback(snapshot as WeeklyFinancialContext)
  }

  if (scope === 'wish_advice') {
    return buildWishFallback(snapshot as WishAdviceContext)
  }

  if (scope === 'dashboard_health') {
    return buildDashboardHealthFallback(snapshot as DashboardHealthContext)
  }

  return buildSimulationFallback(snapshot as SimulationSnapshot)
}

function validateProviderOutput(scope: AiScope, value: unknown) {
  if (scope === 'weekly_summary') {
    return isWeeklyInsightOutput(value)
  }

  if (scope === 'wish_advice') {
    return isWishAdviceOutput(value)
  }

  if (scope === 'dashboard_health') {
    return isDashboardHealthOutput(value)
  }

  return isSimulationOutput(value)
}

function normalizeDecision(value: unknown): WishAdviceOutput['decision'] {
  const normalized = asTrimmedString(value).toLowerCase().replace(/\s+/g, '_')

  if (normalized === 'buy_now' || normalized === 'buy') {
    return 'buy_now'
  }

  if (normalized === 'not_recommended' || normalized === 'dont_buy' || normalized === 'do_not_buy') {
    return 'not_recommended'
  }

  return 'wait'
}

function normalizeConfidence(value: unknown): WishAdviceOutput['confidence'] {
  const normalized = asTrimmedString(value).toLowerCase()
  return normalized === 'low' || normalized === 'high' ? normalized : 'medium'
}

function normalizeUrgency(value: unknown): WishAdviceOutput['urgency'] {
  const normalized = asTrimmedString(value).toLowerCase()
  return normalized === 'low' || normalized === 'high' ? normalized : 'medium'
}

function normalizeTone(value: unknown): WeeklyInsightOutput['tone'] {
  const normalized = asTrimmedString(value).toLowerCase()

  if (normalized === 'stable' || normalized === 'warning') {
    return normalized
  }

  return 'cautious'
}

function normalizeAlertRoute(value: unknown): DashboardHealthOutput['alerts'][number]['route'] {
  const normalized = asTrimmedString(value)

  if (
    normalized === '/insights' ||
    normalized === '/(tabs)/planning' ||
    normalized === '/(tabs)/dashboard' ||
    normalized === '/notifications'
  ) {
    return normalized
  }

  if (normalized === '/planning') {
    return '/(tabs)/planning'
  }

  if (normalized === '/dashboard') {
    return '/(tabs)/dashboard'
  }

  return '/insights'
}

function normalizeSeverity(value: unknown): DashboardHealthOutput['alerts'][number]['severity'] {
  const normalized = asTrimmedString(value).toLowerCase()
  return normalized === 'low' || normalized === 'high' ? normalized : 'medium'
}

function normalizeWishAdviceOutput(value: unknown): WishAdviceOutput | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const headline =
    asTrimmedString(record.headline) ||
    asTrimmedString(record.title) ||
    'Conviene revisar esta compra con cautela.'
  const reason =
    asTrimmedString(record.reason) ||
    asTrimmedString(record.summary) ||
    asTrimmedString(record.explanation)
  const conditionToBuy =
    asTrimmedString(record.conditionToBuy) ||
    asTrimmedString(record.buyCondition) ||
    'Compra solo si mantienes liquidez y reserva despues del gasto.'

  if (!reason) {
    return null
  }

  return {
    conditionToBuy,
    confidence: normalizeConfidence(record.confidence),
    decision: normalizeDecision(record.decision),
    headline,
    reason,
    status: 'ok',
    urgency: normalizeUrgency(record.urgency),
  }
}

function normalizeWeeklyInsightOutputValue(value: unknown): WeeklyInsightOutput | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const summary = asTrimmedString(record.summary)
  const mainRisk = asTrimmedString(record.mainRisk) || asTrimmedString(record.risk)
  const mainOpportunity =
    asTrimmedString(record.mainOpportunity) || asTrimmedString(record.opportunity)
  const shortTip = asTrimmedString(record.shortTip) || asTrimmedString(record.tip)
  const rawActions = Array.isArray(record.actions)
    ? record.actions.map((item) => asTrimmedString(item)).filter(Boolean)
    : []

  if (!summary || !mainRisk || !mainOpportunity || !shortTip) {
    return null
  }

  const actions = rawActions.slice(0, 3)

  while (actions.length < 3) {
    actions.push(shortTip)
  }

  return {
    actions: actions as [string, string, string],
    mainOpportunity,
    mainRisk,
    shortTip,
    status: 'ok',
    summary,
    tone: normalizeTone(record.tone),
  }
}

function normalizeDashboardHealthOutputValue(value: unknown): DashboardHealthOutput | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const summary = asTrimmedString(record.summary)
  const mainRisk = asTrimmedString(record.mainRisk) || asTrimmedString(record.risk)
  const mainOpportunity =
    asTrimmedString(record.mainOpportunity) || asTrimmedString(record.opportunity)
  const immediateAction =
    asTrimmedString(record.immediateAction) ||
    asTrimmedString(record.recommendedAction) ||
    asTrimmedString(record.nextAction)
  const weeklyAction =
    asTrimmedString(record.weeklyAction) ||
    asTrimmedString(record.recommendation) ||
    asTrimmedString(record.plan)

  if (!summary || !mainRisk || !mainOpportunity || !immediateAction || !weeklyAction) {
    return null
  }

  const rawAlerts = Array.isArray(record.alerts) ? record.alerts : []
  const alerts = rawAlerts
    .map((item, index) => {
      const alertRecord = asRecord(item)

      if (!alertRecord) {
        return null
      }

      const title = asTrimmedString(alertRecord.title)
      const body = asTrimmedString(alertRecord.body)

      if (!title || !body) {
        return null
      }

      return {
        body,
        id: asTrimmedString(alertRecord.id) || `alert_${index + 1}`,
        route: normalizeAlertRoute(alertRecord.route),
        severity: normalizeSeverity(alertRecord.severity),
        title,
      }
    })
    .filter(Boolean)
    .slice(0, 3) as DashboardHealthOutput['alerts']

  if (alerts.length === 0) {
    alerts.push({
      body: summary,
      id: 'alert_1',
      route: '/insights',
      severity: 'medium',
      title: 'Resumen financiero',
    })
  }

  return {
    alerts,
    immediateAction,
    mainOpportunity,
    mainRisk,
    status: 'ok',
    summary,
    weeklyAction,
  }
}

function normalizeSimulationOutputValue(value: unknown): SimulationOutput | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const summary = asTrimmedString(record.summary)
  const recommendedAction =
    asTrimmedString(record.recommendedAction) || asTrimmedString(record.nextAction)
  const rawTradeoffs = Array.isArray(record.tradeoffs)
    ? record.tradeoffs.map((item) => asTrimmedString(item)).filter(Boolean)
    : []

  if (!summary || !recommendedAction) {
    return null
  }

  const tradeoffs = rawTradeoffs.slice(0, 2)

  while (tradeoffs.length < 2) {
    tradeoffs.push(summary)
  }

  return {
    recommendedAction,
    status: 'ok',
    summary,
    tradeoffs: tradeoffs as [string, string],
  }
}

function normalizeProviderOutput(scope: AiScope, value: unknown) {
  if (scope === 'weekly_summary') {
    return normalizeWeeklyInsightOutputValue(value)
  }

  if (scope === 'wish_advice') {
    return normalizeWishAdviceOutput(value)
  }

  if (scope === 'dashboard_health') {
    return normalizeDashboardHealthOutputValue(value)
  }

  return normalizeSimulationOutputValue(value)
}

export async function runFinancialAnalysis(args: {
  scope: AiScope
  snapshot: ScopeSnapshot
}): Promise<FinancialAiFunctionResponse> {
  const createdAt = new Date().toISOString()
  const promptVersion = getPromptVersion(args.scope)
  const profile = resolveScopeModelProfile(args.scope)
  const prompt = buildPrompt(args.scope, args.snapshot)

  try {
    const providerResult = await executeProvider({
      model: profile.model,
      prompt,
      provider: profile.provider,
    })
    const normalizedOutput =
      validateProviderOutput(args.scope, providerResult.outputJson)
        ? providerResult.outputJson
        : normalizeProviderOutput(args.scope, providerResult.outputJson)

    if (normalizedOutput && validateProviderOutput(args.scope, normalizedOutput)) {
      return {
        createdAt,
        model: providerResult.model,
        outputJson: normalizedOutput,
        outputText: getFinancialAiOutputText(args.scope, normalizedOutput),
        promptVersion,
        provider: providerResult.provider,
        status: 'ok',
        usage: providerResult.usage,
      }
    }
  } catch {
    // Fall through to deterministic fallback below.
  }

  const fallbackOutput = buildFallback(args.scope, args.snapshot)

  return {
    createdAt,
    model: profile.model,
    outputJson: fallbackOutput,
    outputText: getFinancialAiOutputText(args.scope, fallbackOutput),
    promptVersion,
    provider: profile.provider,
    status: 'fallback',
    usage: {
      inputTokens: null,
      outputTokens: null,
    },
  }
}
