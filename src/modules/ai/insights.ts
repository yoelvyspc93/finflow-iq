import { supabase } from '@/lib/supabase/client'
import type { AiScope } from '@/modules/ai/types'
import type { Json, Tables } from '@/types/supabase'

export type AiInsightRow = Tables<'ai_insights'>

export type AiInsightRecordStatus = 'completed' | 'fallback' | 'failed'

export type AiInsight = {
  createdAt: string
  errorMessage: string | null
  expiresAt: string | null
  id: string
  inputSnapshot: Json
  model: string | null
  outputJson: Json | null
  outputText: string | null
  scope: AiScope
  scopeId: string | null
  snapshotFingerprint: string
  status: AiInsightRecordStatus
  userId: string
}

function mapAiInsight(row: AiInsightRow): AiInsight {
  return {
    createdAt: row.created_at,
    errorMessage: row.error_message,
    expiresAt: row.expires_at,
    id: row.id,
    inputSnapshot: row.input_snapshot,
    model: row.model,
    outputJson: row.output_json,
    outputText: row.output_text,
    scope: row.scope as AiScope,
    scopeId: row.scope_id,
    snapshotFingerprint: row.snapshot_fingerprint,
    status: row.status as AiInsightRecordStatus,
    userId: row.user_id,
  }
}

export async function findReusableAiInsight(args: {
  nowIso?: string
  scope: AiScope
  scopeId?: string | null
  snapshotFingerprint: string
  userId: string
}) {
  const nowIso = args.nowIso ?? new Date().toISOString()
  let query = supabase
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
    args.scopeId === undefined
      ? query.is('scope_id', null)
      : args.scopeId === null
        ? query.is('scope_id', null)
        : query.eq('scope_id', args.scopeId)

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapAiInsight(data) : null
}

export async function findLatestAiInsight(args: {
  scope: AiScope
  scopeId?: string | null
  userId: string
}) {
  let query = supabase
    .from('ai_insights')
    .select('*')
    .eq('user_id', args.userId)
    .eq('scope', args.scope)
    .in('status', ['completed', 'fallback'])
    .order('created_at', { ascending: false })
    .limit(1)

  query =
    args.scopeId === undefined
      ? query.is('scope_id', null)
      : args.scopeId === null
        ? query.is('scope_id', null)
        : query.eq('scope_id', args.scopeId)

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapAiInsight(data) : null
}

export async function createAiInsight(args: {
  errorMessage?: string | null
  expiresAt?: string | null
  inputSnapshot: Json
  model?: string | null
  outputJson?: Json | null
  outputText?: string | null
  scope: AiScope
  scopeId?: string | null
  snapshotFingerprint: string
  status: AiInsightRecordStatus
  userId: string
}) {
  const { data, error } = await supabase
    .from('ai_insights')
    .insert({
      error_message: args.errorMessage ?? null,
      expires_at: args.expiresAt ?? null,
      input_snapshot: args.inputSnapshot,
      model: args.model ?? null,
      output_json: args.outputJson ?? null,
      output_text: args.outputText ?? null,
      scope: args.scope,
      scope_id: args.scopeId ?? null,
      snapshot_fingerprint: args.snapshotFingerprint,
      status: args.status,
      user_id: args.userId,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapAiInsight(data)
}
