// @ts-nocheck

import {
  isAiScope,
  isDashboardHealthContext,
  isSimulationSnapshot,
  isWeeklyFinancialContext,
  isWishAdviceContext,
  type DashboardHealthContext,
  type FinancialAiFunctionRequest,
  type SimulationSnapshot,
  type WeeklyFinancialContext,
  type WishAdviceContext,
} from '../../../src/modules/ai/contracts.ts'
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts'
import { runFinancialAnalysis } from '../_shared/financial-ai-runner.ts'
import { createUserScopedClient } from '../_shared/supabase-clients.ts'

type ScopeSnapshot =
  | WeeklyFinancialContext
  | WishAdviceContext
  | DashboardHealthContext
  | SimulationSnapshot

function isValidSnapshot(body: Partial<FinancialAiFunctionRequest>): body is FinancialAiFunctionRequest {
  if (!isAiScope(body.scope)) {
    return false
  }

  if (typeof body.userId !== 'string' || body.userId.length === 0) {
    return false
  }

  if (body.scope === 'weekly_summary') {
    return isWeeklyFinancialContext(body.snapshot)
  }

  if (body.scope === 'wish_advice') {
    return isWishAdviceContext(body.snapshot)
  }

  if (body.scope === 'dashboard_health') {
    return isDashboardHealthContext(body.snapshot)
  }

  return isSimulationSnapshot(body.snapshot)
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  try {
    const body = (await request.json()) as Partial<FinancialAiFunctionRequest>

    if (!isValidSnapshot(body)) {
      return jsonResponse(400, { error: 'Invalid financial AI payload.' })
    }

    const supabase = createUserScopedClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(401, { error: 'Unauthorized.' })
    }

    if (user.id !== body.userId || body.snapshot.user.id !== user.id) {
      return jsonResponse(403, { error: 'User scope mismatch.' })
    }

    const response = await runFinancialAnalysis({
      scope: body.scope,
      snapshot: body.snapshot as ScopeSnapshot,
    })

    return jsonResponse(200, response)
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unexpected error.',
    })
  }
})
