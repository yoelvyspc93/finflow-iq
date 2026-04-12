// @ts-nocheck

import {
  isDashboardHealthContext,
  isWeeklyFinancialContext,
  isWishAdviceContext,
  type DashboardHealthContext,
  type EnqueueFinancialAiFunctionRequest,
  type EnqueueFinancialAiJob,
  type WeeklyFinancialContext,
  type WishAdviceContext,
} from '../../../src/modules/ai/contracts.ts'
import { enqueueAiJob } from '../_shared/ai-db.ts'
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient, createUserScopedClient } from '../_shared/supabase-clients.ts'

type QueueSnapshot = WeeklyFinancialContext | WishAdviceContext | DashboardHealthContext

function isQueueJob(value: unknown): value is EnqueueFinancialAiJob {
  if (!value || typeof value !== 'object') {
    return false
  }

  const job = value as Record<string, unknown>

  if (typeof job.triggerSource !== 'string' || job.triggerSource.length === 0) {
    return false
  }

  if (job.scope === 'weekly_summary') {
    return isWeeklyFinancialContext(job.snapshot)
  }

  if (job.scope === 'dashboard_health') {
    return isDashboardHealthContext(job.snapshot)
  }

  if (job.scope === 'wish_advice') {
    return typeof job.scopeId === 'string' && isWishAdviceContext(job.snapshot)
  }

  return false
}

function getScopeId(job: EnqueueFinancialAiJob) {
  if (job.scope === 'wish_advice') {
    return job.scopeId
  }

  return null
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  try {
    const supabase = createUserScopedClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(401, { error: 'Unauthorized.' })
    }

    const body = (await request.json()) as Partial<EnqueueFinancialAiFunctionRequest>

    if (!Array.isArray(body.jobs) || body.jobs.length === 0) {
      return jsonResponse(400, { error: 'jobs must be a non-empty array.' })
    }

    const invalidJob = body.jobs.find((job) => !isQueueJob(job))

    if (invalidJob) {
      return jsonResponse(400, { error: 'Invalid AI job payload.' })
    }

    const admin = createAdminClient()
    const results = []

    for (const job of body.jobs as EnqueueFinancialAiJob[]) {
      const scopeId = getScopeId(job)
      const snapshot = job.snapshot as QueueSnapshot

      if (snapshot.user.id !== user.id) {
        return jsonResponse(403, { error: 'User scope mismatch.' })
      }

      if (job.scope === 'wish_advice' && job.scopeId !== snapshot.wish.id) {
        return jsonResponse(400, { error: 'wish_advice scopeId must match snapshot.wish.id.' })
      }

      const decision = await enqueueAiJob({
        admin,
        job,
        userId: user.id,
      })

      results.push({
        aiInsightId: decision.insightId,
        jobId: decision.jobId,
        scope: job.scope,
        scopeId,
        snapshotFingerprint: decision.snapshotFingerprint,
        status: decision.status,
      })
    }

    return jsonResponse(200, { jobs: results })
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unexpected error.',
    })
  }
})
