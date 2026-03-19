import { describe, expect, it } from 'vitest'

import type { FinancesDraft } from '@/components/finances/finances-form-sheet'
import type { SalaryPeriod } from '@/modules/salary/types'
import {
  asSalaryCurrency,
  buildFinancesDraftForSheet,
  getFinancesFormCopy,
  getFinancesQuickActionDescriptors,
  getVisibleSalaryPeriods,
  resolveActiveFinancesFormSheet,
  summarizeSalaryPeriods,
} from '@/modules/finances/view-model'

function createWallet(args: {
  currency: string
  id: string
  name: string
  position?: number
  userId: string
}) {
  return {
    balance: 0,
    color: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    currency: args.currency,
    icon: null,
    id: args.id,
    isActive: true,
    name: args.name,
    position: args.position ?? 0,
    updatedAt: '2026-03-01T00:00:00.000Z',
    userId: args.userId,
  }
}

function createDraft(): FinancesDraft {
  return {
    amount: '120',
    categoryId: 'cat-1',
    date: '2026-03-18',
    description: 'Seed',
    destinationAmount: '100',
    destinationWalletId: 'wallet-usd',
    incomeSourceId: 'inc-1',
    rate: '24',
    wish: true,
  }
}

function createSalaryPeriod(input: Partial<SalaryPeriod>): SalaryPeriod {
  return {
    coveredAmount: 0,
    createdAt: '2026-03-01T00:00:00.000Z',
    currency: 'USD',
    expectedAmount: 1000,
    id: 'period-1',
    notes: null,
    periodMonth: '2026-03-01',
    status: 'pending',
    updatedAt: '2026-03-01T00:00:00.000Z',
    userId: 'user-1',
    ...input,
  }
}

describe('finances view model', () => {
  it('resolves transfer defaults and resets volatile fields', () => {
    const wallets = [
      createWallet({ currency: 'CUP', id: 'wallet-cup', name: 'CUP', userId: 'user-1' }),
      createWallet({ currency: 'USD', id: 'wallet-usd', name: 'USD', position: 1, userId: 'user-1' }),
    ]

    const next = buildFinancesDraftForSheet({
      activeWalletCurrency: 'CUP',
      currentDraft: createDraft(),
      selectedWalletId: 'wallet-cup',
      sheet: 'transfer',
      today: '2026-03-18',
      wallets,
    })

    expect(next.amount).toBe('')
    expect(next.description).toBe('')
    expect(next.rate).toBe('1')
    expect(next.wish).toBe(false)
    expect(next.destinationWalletId).toBe('wallet-usd')
    expect(next.categoryId).toBe('cat-1')
    expect(next.incomeSourceId).toBe('inc-1')
  })

  it('uses month token for salary-period date', () => {
    const next = buildFinancesDraftForSheet({
      activeWalletCurrency: 'USD',
      currentDraft: createDraft(),
      selectedWalletId: 'wallet-usd',
      sheet: 'salary-period',
      today: '2026-03-18',
      wallets: [],
    })

    expect(next.date).toBe('2026-03-01')
  })

  it('derives active form sheet and copy', () => {
    expect(resolveActiveFinancesFormSheet('quick')).toBeNull()
    expect(resolveActiveFinancesFormSheet('income')).toBe('income')
    expect(getFinancesFormCopy('salary-payment')).toEqual({
      submitLabel: 'Guardar Salario',
      title: 'Registrar Salario',
    })
  })

  it('filters and summarizes salary periods by wallet currency', () => {
    const periods = [
      createSalaryPeriod({
        coveredAmount: 400,
        currency: 'USD',
        expectedAmount: 1000,
        id: 'usd-1',
        status: 'partial',
      }),
      createSalaryPeriod({
        coveredAmount: 500,
        currency: 'CUP',
        expectedAmount: 500,
        id: 'cup-1',
        status: 'covered',
      }),
      createSalaryPeriod({
        coveredAmount: 0,
        currency: 'USD',
        expectedAmount: 300,
        id: 'usd-2',
        status: 'pending',
      }),
    ]

    const visible = getVisibleSalaryPeriods({
      activeWalletCurrency: 'USD',
      salaryPeriods: periods,
    })
    const summary = summarizeSalaryPeriods(visible)

    expect(visible.map((period) => period.id)).toEqual(['usd-1', 'usd-2'])
    expect(summary.pendingMonths).toBe(2)
    expect(summary.pendingSalary).toBe(900)
  })

  it('exposes the five quick actions and salary currency normalization', () => {
    expect(getFinancesQuickActionDescriptors()).toHaveLength(5)
    expect(asSalaryCurrency('USD')).toBe('USD')
    expect(asSalaryCurrency('EUR')).toBeNull()
  })
})
