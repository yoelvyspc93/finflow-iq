import { describe, expect, it } from 'vitest'

import {
  createSnapshotFingerprint,
  getAiInsightExpiresAt,
  getAiInsightTtlMs,
} from '@/modules/ai/cache'

describe('ai cache helpers', () => {
  it('builds a stable fingerprint regardless of object key order', () => {
    const left = createSnapshotFingerprint({
      scope: 'weekly_summary',
      summary: { assignableAmount: 10, score: 60 },
      user: { id: 'user-1' },
    })
    const right = createSnapshotFingerprint({
      user: { id: 'user-1' },
      summary: { score: 60, assignableAmount: 10 },
      scope: 'weekly_summary',
    })

    expect(left).toBe(right)
  })

  it('ignores generatedAt in snapshot fingerprints', () => {
    const left = createSnapshotFingerprint({
      generatedAt: '2026-03-20T00:00:00.000Z',
      scope: 'weekly_summary',
      summary: { assignableAmount: 10, score: 60 },
    })
    const right = createSnapshotFingerprint({
      generatedAt: '2026-03-21T00:00:00.000Z',
      scope: 'weekly_summary',
      summary: { assignableAmount: 10, score: 60 },
    })

    expect(left).toBe(right)
  })

  it('uses scope-specific ttl windows', () => {
    expect(getAiInsightTtlMs('weekly_summary')).toBe(7 * 24 * 60 * 60 * 1000)
    expect(getAiInsightTtlMs('dashboard_health')).toBe(24 * 60 * 60 * 1000)
    expect(getAiInsightTtlMs('wish_advice')).toBe(3 * 24 * 60 * 60 * 1000)
    expect(getAiInsightExpiresAt('wish_advice', '2026-03-20T00:00:00.000Z')).toBe(
      '2026-03-23T00:00:00.000Z',
    )
  })
})
