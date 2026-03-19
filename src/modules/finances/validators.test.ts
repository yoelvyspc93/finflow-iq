import { describe, expect, it } from 'vitest'

import type { FinancesDraft } from '@/components/finances/finances-form-sheet'
import {
  validateFinancesBaseSubmit,
  validateSalaryCurrency,
  validateSalaryPeriodToken,
  validateTransferDraft,
} from '@/modules/finances/validators'

function createDraft(): FinancesDraft {
  return {
    amount: '100',
    categoryId: null,
    date: '2026-03-18',
    description: '',
    destinationAmount: '2400',
    destinationWalletId: 'wallet-usd',
    incomeSourceId: null,
    rate: '24',
    wish: false,
  }
}

describe('finances validators', () => {
  it('rejects missing wallet or invalid amount before submit', () => {
    expect(
      validateFinancesBaseSubmit({
        amountText: '100',
        selectedWalletId: null,
        userId: 'user-1',
      }),
    ).toBe('Selecciona una billetera válida.')

    expect(
      validateFinancesBaseSubmit({
        amountText: '0',
        selectedWalletId: 'wallet-cup',
        userId: 'user-1',
      }),
    ).toBe('El monto debe ser mayor que cero.')
  })

  it('rejects invalid transfer paths', () => {
    expect(
      validateTransferDraft({
        activeWalletCurrency: 'CUP',
        draft: { ...createDraft(), destinationWalletId: null },
        wallets: [],
      }),
    ).toBe('Selecciona una billetera de destino.')

    expect(
      validateTransferDraft({
        activeWalletCurrency: 'CUP',
        draft: createDraft(),
        wallets: [{ currency: 'CUP', id: 'wallet-usd', isActive: true }],
      }),
    ).toBe('La transferencia debe ser entre monedas activas diferentes.')

    expect(
      validateTransferDraft({
        activeWalletCurrency: 'CUP',
        draft: { ...createDraft(), destinationAmount: '0' },
        wallets: [{ currency: 'USD', id: 'wallet-usd', isActive: true }],
      }),
    ).toBe('Completa un monto de destino y una tasa válidos.')
  })

  it('rejects invalid salary configuration', () => {
    expect(validateSalaryCurrency(null)).toBe('La billetera activa debe ser USD o CUP.')
    expect(validateSalaryCurrency('USD')).toBeNull()
    expect(validateSalaryPeriodToken('2026/03')).toBe(
      'La fecha del período debe tener el formato AAAA-MM.',
    )
    expect(validateSalaryPeriodToken('2026-03-18')).toBeNull()
  })
})
