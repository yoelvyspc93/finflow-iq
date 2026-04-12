import { describe, expect, it } from 'vitest'

import {
  hasMaterialAiSnapshotChange,
  shouldCallAiProvider,
} from '@/modules/ai/policy'

describe('ai policy', () => {
  it('detects material change in weekly snapshots', () => {
    expect(
      hasMaterialAiSnapshotChange({
        nextSnapshot: {
          scope: 'weekly_summary',
          summary: { assignableAmount: 90, financialScore: 67, pendingSalaryAmount: 100 },
          wishlist: { totalActiveWishes: 2 },
        },
        previousSnapshot: {
          scope: 'weekly_summary',
          summary: { assignableAmount: 130, financialScore: 67, pendingSalaryAmount: 100 },
          wishlist: { totalActiveWishes: 2 },
        },
        scope: 'weekly_summary',
      } as any),
    ).toBe(true)
  })

  it('skips provider in manual mode and allows it in simulation', () => {
    expect(
      shouldCallAiProvider({
        frequency: 'manual',
        isMaterialChange: true,
        latestInsightCreatedAt: null,
        scope: 'weekly_summary',
      }),
    ).toBe(false)

    expect(
      shouldCallAiProvider({
        frequency: 'manual',
        isMaterialChange: false,
        latestInsightCreatedAt: null,
        scope: 'simulation',
      }),
    ).toBe(true)
  })
})
