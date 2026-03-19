import { describe, expect, it } from 'vitest'

import { createLocalWish, mapWish } from '@/modules/wishes/types'

describe('wish types', () => {
  it('maps purchase details without overwriting the estimated amount', () => {
    const mapped = mapWish({
      actual_purchase_amount: 135,
      ai_advice: null,
      confidence_level: 'medium',
      confidence_reason: 'Ahorro estable',
      created_at: '2026-03-19T00:00:00.000Z',
      estimated_amount: 120,
      estimated_purchase_date: '2026-04-01',
      id: 'wish-1',
      is_purchased: true,
      last_ai_advice_at: null,
      last_calculated_at: null,
      name: 'Auriculares',
      notes: null,
      priority: 1,
      purchase_ledger_entry_id: 'entry-1',
      purchased_at: '2026-03-19T00:00:00.000Z',
      updated_at: '2026-03-19T00:00:00.000Z',
      user_id: 'user-1',
      wallet_id: 'wallet-1',
    })

    expect(mapped.estimatedAmount).toBe(120)
    expect(mapped.actualPurchaseAmount).toBe(135)
    expect(mapped.purchaseLedgerEntryId).toBe('entry-1')

    expect(
      createLocalWish({
        estimatedAmount: 80,
        name: 'Libro',
        priority: 2,
        userId: 'user-1',
        walletId: 'wallet-1',
      }).actualPurchaseAmount,
    ).toBeNull()
  })
})
