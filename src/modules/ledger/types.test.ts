import { describe, expect, it } from 'vitest'

import { createLocalLedgerEntry, mapLedgerEntry } from '@/modules/ledger/types'

describe('ledger types', () => {
  it('maps and creates ledger entries with optional wish references', () => {
    expect(
      mapLedgerEntry({
        amount: -120,
        budget_provision_id: null,
        category_id: 'cat-1',
        created_at: '2026-03-19T00:00:00.000Z',
        date: '2026-03-19',
        description: 'Compra',
        id: 'entry-1',
        income_source_id: null,
        recurring_expense_id: null,
        type: 'expense',
        user_id: 'user-1',
        wallet_id: 'wallet-1',
        wish_id: 'wish-1',
      }).wishId,
    ).toBe('wish-1')

    expect(
      createLocalLedgerEntry({
        amount: -120,
        date: '2026-03-19',
        type: 'expense',
        userId: 'user-1',
        walletId: 'wallet-1',
        wishId: 'wish-1',
      }).wishId,
    ).toBe('wish-1')
  })
})
