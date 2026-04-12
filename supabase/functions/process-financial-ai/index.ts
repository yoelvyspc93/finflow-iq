// @ts-nocheck

import {
  getAiInsightExpiresAt,
  getFinancialAiOutputText,
  isDashboardHealthContext,
  isWeeklyFinancialContext,
  isWishAdviceContext,
  type ActiveAiScope,
  type DashboardHealthContext,
  type WeeklyFinancialContext,
  type WishAdviceContext,
} from '../../../src/modules/ai/contracts.ts'
import { persistAiInsight } from '../_shared/ai-db.ts'
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts'
import { runFinancialAnalysis } from '../_shared/financial-ai-runner.ts'
import { createAdminClient } from '../_shared/supabase-clients.ts'

type QueueSnapshot = WeeklyFinancialContext | WishAdviceContext | DashboardHealthContext

type ClaimedAiJob = {
  ai_insight_id: string | null
  attempts: number
  id: string
  input_snapshot: unknown
  max_attempts: number
  scope: ActiveAiScope
  scope_id: string | null
  snapshot_fingerprint: string
  user_id: string
}

function parseBatchSize(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 5
  }

  return Math.max(1, Math.min(Math.trunc(value), 20))
}

function isValidQueuedSnapshot(scope: ActiveAiScope, snapshot: unknown): snapshot is QueueSnapshot {
  if (scope === 'weekly_summary') {
    return isWeeklyFinancialContext(snapshot)
  }

  if (scope === 'wish_advice') {
    return isWishAdviceContext(snapshot)
  }

  return isDashboardHealthContext(snapshot)
}

async function markCompleted(args: {
  admin: ReturnType<typeof createAdminClient>
  aiInsightId: string
  jobId: string
  model: string
  promptVersion: string
  provider: string
}) {
  const { error } = await args.admin
    .from('ai_jobs')
    .update({
      ai_insight_id: args.aiInsightId,
      completed_at: new Date().toISOString(),
      last_error: null,
      model: args.model,
      prompt_version: args.promptVersion,
      provider: args.provider,
      status: 'completed',
    })
    .eq('id', args.jobId)

  if (error) {
    throw error
  }
}

async function markRetryableFailure(args: {
  admin: ReturnType<typeof createAdminClient>
  attempts: number
  errorMessage: string
  jobId: string
  maxAttempts: number
}) {
  const nextStatus = args.attempts >= args.maxAttempts ? 'dead_letter' : 'failed'
  const retryAt =
    nextStatus === 'dead_letter'
      ? new Date().toISOString()
      : new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { error } = await args.admin
    .from('ai_jobs')
    .update({
      available_at: retryAt,
      completed_at: nextStatus === 'dead_letter' ? new Date().toISOString() : null,
      last_error: args.errorMessage,
      status: nextStatus,
    })
    .eq('id', args.jobId)

  if (error) {
    throw error
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  const cronSecret = Deno.env.get('PROCESS_FINANCIAL_AI_CRON_SECRET')

  if (!cronSecret || request.headers.get('x-finflow-cron-secret') !== cronSecret) {
    return jsonResponse(401, { error: 'Unauthorized.' })
  }

  try {
    const admin = createAdminClient()
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : {}
    const batchSize = parseBatchSize((body as { batchSize?: number }).batchSize)
    const { data, error } = await admin.rpc('claim_ai_jobs', {
      target_batch_size: batchSize,
    })

    if (error) {
      throw error
    }

    const claimedJobs = (data ?? []) as ClaimedAiJob[]
    const processed: Array<{ id: string; status: string }> = []

    for (const job of claimedJobs) {
      try {
        if (!isValidQueuedSnapshot(job.scope, job.input_snapshot)) {
          await markRetryableFailure({
            admin,
            attempts: job.attempts,
            errorMessage: 'Invalid queued snapshot.',
            jobId: job.id,
            maxAttempts: job.max_attempts,
          })
          processed.push({ id: job.id, status: 'invalid_snapshot' })
          continue
        }

        const snapshot = job.input_snapshot as QueueSnapshot
        const startedAt = Date.now()
        const aiResponse = await runFinancialAnalysis({
          scope: job.scope,
          snapshot,
        })
        const latencyMs = Date.now() - startedAt
        const outputText = getFinancialAiOutputText(job.scope, aiResponse.outputJson)
        const aiInsightId = await persistAiInsight({
          admin,
          aiInsightId: job.ai_insight_id,
          createdAt: aiResponse.createdAt,
          errorMessage: null,
          expiresAt: getAiInsightExpiresAt(job.scope, aiResponse.createdAt),
          inputSnapshot: snapshot,
          jobId: job.id,
          latencyMs,
          model: aiResponse.model,
          outputJson: aiResponse.outputJson,
          outputText,
          promptVersion: aiResponse.promptVersion,
          provider: aiResponse.provider,
          scope: job.scope,
          scopeId: job.scope_id,
          snapshotFingerprint: job.snapshot_fingerprint,
          source: 'queue_worker',
          status: aiResponse.status === 'fallback' ? 'fallback' : 'completed',
          usage: aiResponse.usage,
          userId: job.user_id,
        })

        if (job.scope === 'weekly_summary') {
          const latestScore = await admin
            .from('financial_scores')
            .select('id')
            .eq('user_id', job.user_id)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle<{ id: string }>()

          if (latestScore.error) {
            throw latestScore.error
          }

          if (latestScore.data?.id) {
            const { error: scoreError } = await admin
              .from('financial_scores')
              .update({
                ai_tip: outputText,
              })
              .eq('id', latestScore.data.id)

            if (scoreError) {
              throw scoreError
            }
          }
        }

        if (job.scope === 'wish_advice' && job.scope_id) {
          const { error: wishError } = await admin
            .from('wishes')
            .update({
              ai_advice: outputText,
              last_ai_advice_at: aiResponse.createdAt,
            })
            .eq('id', job.scope_id)

          if (wishError) {
            throw wishError
          }
        }

        await markCompleted({
          admin,
          aiInsightId,
          jobId: job.id,
          model: aiResponse.model,
          promptVersion: aiResponse.promptVersion,
          provider: aiResponse.provider,
        })
        processed.push({
          id: job.id,
          status: aiResponse.status === 'fallback' ? 'fallback' : 'completed',
        })
      } catch (jobError) {
        await markRetryableFailure({
          admin,
          attempts: job.attempts,
          errorMessage: jobError instanceof Error ? jobError.message : 'Unknown AI processing error.',
          jobId: job.id,
          maxAttempts: job.max_attempts,
        })
        processed.push({ id: job.id, status: 'failed' })
      }
    }

    return jsonResponse(200, {
      claimedCount: claimedJobs.length,
      processed,
    })
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unexpected error.',
    })
  }
})
