// @ts-nocheck

import {
  createSnapshotFingerprint,
  getAiAnalysisFrequency,
  getAiInsightExpiresAt,
  hasMaterialAiSnapshotChange,
  shouldQueueAiGeneration,
  type ActiveAiScope,
  type DashboardHealthContext,
  type DashboardHealthOutput,
  type EnqueueFinancialAiJob,
  type WeeklyFinancialContext,
  type WishAdviceContext,
} from '../../../src/modules/ai/contracts.ts'
import { createAdminClient } from './supabase-clients.ts'

type QueueSnapshot = WeeklyFinancialContext | WishAdviceContext | DashboardHealthContext

type AdminClient = ReturnType<typeof createAdminClient>

type AiInsightRow = {
  created_at: string
  expires_at: string | null
  id: string
  input_snapshot: unknown
  output_json: unknown
  output_text: string | null
  scope: string
  scope_id: string | null
  snapshot_fingerprint: string
  status: string
}

type EnqueueDecision = {
  insightId: string | null
  jobId: string | null
  snapshotFingerprint: string
  status: 'queued' | 'reused'
}

function normalizeScopeId(scopeId?: string | null) {
  return scopeId ?? null
}

export async function findReusableAiInsight(args: {
  admin: AdminClient
  nowIso?: string
  scope: ActiveAiScope
  scopeId?: string | null
  snapshotFingerprint: string
  userId: string
}) {
  const nowIso = args.nowIso ?? new Date().toISOString()
  let query = args.admin
    .from('ai_insights')
    .select('*')
    .eq('user_id', args.userId)
    .eq('scope', args.scope)
    .eq('snapshot_fingerprint', args.snapshotFingerprint)
    .gte('expires_at', nowIso)
    .in('status', ['completed', 'fallback'])
    .order('created_at', { ascending: false })
    .limit(1)

  query =
    args.scopeId === undefined || args.scopeId === null
      ? query.is('scope_id', null)
      : query.eq('scope_id', args.scopeId)

  const { data, error } = await query.maybeSingle<AiInsightRow>()

  if (error) {
    throw error
  }

  return data
}

export async function findLatestAiInsight(args: {
  admin: AdminClient
  scope: ActiveAiScope
  scopeId?: string | null
  userId: string
}) {
  let query = args.admin
    .from('ai_insights')
    .select('*')
    .eq('user_id', args.userId)
    .eq('scope', args.scope)
    .in('status', ['completed', 'fallback'])
    .order('created_at', { ascending: false })
    .limit(1)

  query =
    args.scopeId === undefined || args.scopeId === null
      ? query.is('scope_id', null)
      : query.eq('scope_id', args.scopeId)

  const { data, error } = await query.maybeSingle<AiInsightRow>()

  if (error) {
    throw error
  }

  return data
}

export async function enqueueAiJob(args: {
  admin: AdminClient
  job: EnqueueFinancialAiJob
  maxAttempts?: number
  nowIso?: string
  priority?: number
  userId: string
}): Promise<EnqueueDecision> {
  const scope = args.job.scope
  const scopeId = normalizeScopeId(args.job.scopeId)
  const snapshot = args.job.snapshot as QueueSnapshot
  const nowIso = args.nowIso ?? new Date().toISOString()
  const snapshotFingerprint = createSnapshotFingerprint(snapshot)

  const reusableInsight = await findReusableAiInsight({
    admin: args.admin,
    nowIso,
    scope,
    scopeId,
    snapshotFingerprint,
    userId: args.userId,
  })

  if (reusableInsight) {
    return {
      insightId: reusableInsight.id,
      jobId: null,
      snapshotFingerprint,
      status: 'reused',
    }
  }

  const latestInsight = await findLatestAiInsight({
    admin: args.admin,
    scope,
    scopeId,
    userId: args.userId,
  })
  const isMaterialChange = hasMaterialAiSnapshotChange({
    nextSnapshot: snapshot,
    previousSnapshot: latestInsight?.input_snapshot ?? null,
    scope,
  })
  const shouldQueue = shouldQueueAiGeneration({
    frequency: getAiAnalysisFrequency(snapshot),
    isMaterialChange,
    latestInsightCreatedAt: latestInsight?.created_at ?? null,
    nowIso,
    scope,
  })

  if (!shouldQueue && latestInsight) {
    return {
      insightId: latestInsight.id,
      jobId: null,
      snapshotFingerprint,
      status: 'reused',
    }
  }

  if (!shouldQueue) {
    return {
      insightId: null,
      jobId: null,
      snapshotFingerprint,
      status: 'reused',
    }
  }

  const { data, error } = await args.admin
    .from('ai_jobs')
    .insert({
      available_at: nowIso,
      input_snapshot: snapshot,
      max_attempts: args.maxAttempts ?? 3,
      priority: args.priority ?? 100,
      scope,
      scope_id: scopeId,
      snapshot_fingerprint: snapshotFingerprint,
      status: 'pending',
      trigger_source: args.job.triggerSource,
      user_id: args.userId,
    })
    .select('id')
    .single()

  if (error) {
    let existingJobQuery = args.admin
      .from('ai_jobs')
      .select('id')
      .eq('user_id', args.userId)
      .eq('scope', scope)
      .eq('snapshot_fingerprint', snapshotFingerprint)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)

    existingJobQuery =
      scopeId === null
        ? existingJobQuery.is('scope_id', null)
        : existingJobQuery.eq('scope_id', scopeId)

    const existingJob = await existingJobQuery.maybeSingle<{ id: string }>()

    if (existingJob.error) {
      throw existingJob.error
    }

    if (existingJob.data) {
      return {
        insightId: null,
        jobId: existingJob.data.id,
        snapshotFingerprint,
        status: 'queued',
      }
    }

    throw error
  }

  return {
    insightId: null,
    jobId: data.id,
    snapshotFingerprint,
    status: 'queued',
  }
}

export async function persistAiInsight(args: {
  admin: AdminClient
  aiInsightId?: string | null
  createdAt: string
  errorMessage?: string | null
  expiresAt?: string | null
  inputSnapshot: QueueSnapshot
  jobId?: string | null
  latencyMs?: number | null
  model?: string | null
  outputJson?: DashboardHealthOutput | unknown | null
  outputText?: string | null
  promptVersion?: string | null
  provider?: string | null
  scope: ActiveAiScope
  scopeId?: string | null
  snapshotFingerprint: string
  source?: string | null
  status: 'completed' | 'fallback' | 'failed'
  usage?: {
    inputTokens: number | null
    outputTokens: number | null
  }
  userId: string
}) {
  const payload = {
    error_message: args.errorMessage ?? null,
    expires_at: args.expiresAt ?? getAiInsightExpiresAt(args.scope, args.createdAt),
    input_snapshot: args.inputSnapshot,
    job_id: args.jobId ?? null,
    latency_ms: args.latencyMs ?? null,
    model: args.model ?? null,
    output_json: args.outputJson ?? null,
    output_text: args.outputText ?? null,
    prompt_version: args.promptVersion ?? null,
    provider: args.provider ?? null,
    scope: args.scope,
    scope_id: normalizeScopeId(args.scopeId),
    snapshot_fingerprint: args.snapshotFingerprint,
    source: args.source ?? null,
    status: args.status,
    user_id: args.userId,
    input_tokens: args.usage?.inputTokens ?? null,
    output_tokens: args.usage?.outputTokens ?? null,
  }

  if (args.aiInsightId) {
    const { data, error } = await args.admin
      .from('ai_insights')
      .update(payload)
      .eq('id', args.aiInsightId)
      .select('id')
      .single()

    if (error) {
      throw error
    }

    return data.id
  }

  const { data, error } = await args.admin
    .from('ai_insights')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data.id
}
