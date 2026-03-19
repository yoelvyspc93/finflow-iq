import { useEffect, useState } from 'react'

import type { FinancesDraft, FinancesFormSheetMode } from '@/components/finances/finances-form-sheet'
import { listCategories } from '@/modules/categories/service'
import type { Category } from '@/modules/categories/types'
import { transferBetweenWallets } from '@/modules/exchanges/service'
import { listIncomeSources } from '@/modules/income-sources/service'
import type { IncomeSource } from '@/modules/income-sources/types'
import { createExpense, createManualIncome } from '@/modules/ledger/service'
import {
  validateFinancesBaseSubmit,
  validateSalaryCurrency,
  validateSalaryPeriodToken,
  validateTransferDraft,
} from '@/modules/finances/validators'
import {
  createSalaryPeriod,
  registerSalaryPayment,
} from '@/modules/salary/service'
import {
  type SalaryAllocationInput,
  type SalaryCurrency,
  type SalaryPeriod,
} from '@/modules/salary/types'
import type { Wallet } from '@/modules/wallets/types'

export function useFinancesMovements(args: {
  activeWalletCurrency: string | null | undefined
  draft: FinancesDraft
  selectedWalletId: string | null
  setDraft: React.Dispatch<React.SetStateAction<FinancesDraft>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  syncAll: () => Promise<void>
  userId: string | undefined
  visiblePeriods: SalaryPeriod[]
  wallets: Wallet[]
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const { setDraft, userId } = args

  useEffect(() => {
    if (!userId) return
    void Promise.all([
      listCategories({ userId }),
      listIncomeSources({ userId }),
    ]).then(([nextCategories, nextIncomeSources]) => {
      setCategories(nextCategories)
      setIncomeSources(nextIncomeSources)
      setDraft((current) => ({
        ...current,
        categoryId: current.categoryId ?? nextCategories[0]?.id ?? null,
        incomeSourceId: current.incomeSourceId ?? nextIncomeSources[0]?.id ?? null,
      }))
    })
  }, [setDraft, userId])

  async function submitMovementSheet(sheet: FinancesFormSheetMode) {
    const baseValidationError = validateFinancesBaseSubmit({
      amountText: args.draft.amount,
      selectedWalletId: args.selectedWalletId,
      userId: args.userId,
    })
    if (baseValidationError) {
      args.setError(baseValidationError)
      return true
    }
    const userId = args.userId
    const selectedWalletId = args.selectedWalletId
    if (!userId || !selectedWalletId) {
      return true
    }
    const amount = Number(args.draft.amount)

    if (sheet !== 'expense' && sheet !== 'income' && sheet !== 'transfer') {
      return false
    }

    args.setIsSubmitting(true)
    args.setError(null)

    try {
      if (sheet === 'expense') {
        await createExpense({
          amount,
          categoryId: args.draft.categoryId,
          date: args.draft.date,
          description: args.draft.description || undefined,
          walletId: selectedWalletId,
        })
        await args.syncAll()
      }

      if (sheet === 'income') {
        await createManualIncome({
          amount,
          date: args.draft.date,
          description: args.draft.description || undefined,
          incomeSourceId: args.draft.incomeSourceId,
          walletId: selectedWalletId,
        })
        await args.syncAll()
      }

      if (sheet === 'transfer') {
        const transferValidationError = validateTransferDraft({
          activeWalletCurrency: args.activeWalletCurrency,
          draft: args.draft,
          wallets: args.wallets,
        })
        if (transferValidationError) {
          args.setError(transferValidationError)
          args.setIsSubmitting(false)
          return true
        }
        const destinationWalletId = args.draft.destinationWalletId
        if (!destinationWalletId) {
          args.setIsSubmitting(false)
          return true
        }

        const destinationAmount = Number(args.draft.destinationAmount || args.draft.amount)
        const rate = Number(args.draft.rate)

        await transferBetweenWallets({
          description: args.draft.description || undefined,
          destinationAmount,
          destinationWalletId,
          exchangeRate: rate,
          sourceAmount: amount,
          sourceWalletId: selectedWalletId,
          transferDate: args.draft.date,
        })
        await args.syncAll()
      }

      args.setIsSubmitting(false)
      return true
    } catch (caughtError) {
      args.setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo completar la acción.',
      )
      args.setIsSubmitting(false)
      return true
    }
  }

  async function submitSalarySheet(argsForSalary: {
    sheet: FinancesFormSheetMode
    salaryCurrency: SalaryCurrency | null
  }) {
    const baseValidationError = validateFinancesBaseSubmit({
      amountText: args.draft.amount,
      selectedWalletId: args.selectedWalletId,
      userId: args.userId,
    })
    if (baseValidationError) {
      args.setError(baseValidationError)
      return true
    }
    const selectedWalletId = args.selectedWalletId
    if (!selectedWalletId) {
      return true
    }
    const amount = Number(args.draft.amount)

    const { salaryCurrency, sheet } = argsForSalary
    if (sheet !== 'salary-period' && sheet !== 'salary-payment') {
      return false
    }

    const salaryCurrencyError = validateSalaryCurrency(salaryCurrency)
    if (salaryCurrencyError) {
      args.setError(salaryCurrencyError)
      return true
    }
    if (!salaryCurrency) {
      return true
    }
    const currency = salaryCurrency

    args.setIsSubmitting(true)
    args.setError(null)

    try {
      if (sheet === 'salary-period') {
        const periodValidationError = validateSalaryPeriodToken(args.draft.date)
        if (periodValidationError) {
          args.setError(periodValidationError)
          args.setIsSubmitting(false)
          return true
        }

        const periodToken = args.draft.date.slice(0, 7)
        const periodMonth = `${periodToken}-01`
        await createSalaryPeriod({
          currency,
          expectedAmount: amount,
          notes: args.draft.description || undefined,
          periodMonth,
        })
        await args.syncAll()
      }

      if (sheet === 'salary-payment') {
        const allocations: SalaryAllocationInput[] = []
        let remaining = amount
        for (const period of args.visiblePeriods) {
          const pending = period.expectedAmount - period.coveredAmount
          if (pending <= 0 || remaining <= 0) continue
          const allocation = Math.min(pending, remaining)
          allocations.push({ amount: allocation, salaryPeriodId: period.id })
          remaining -= allocation
        }

        await registerSalaryPayment({
          allocations,
          amount,
          currency,
          description: args.draft.description || undefined,
          paymentDate: args.draft.date,
          walletId: selectedWalletId,
        })
        await args.syncAll()
      }

      args.setIsSubmitting(false)
      return true
    } catch (caughtError) {
      args.setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo completar la acción.',
      )
      args.setIsSubmitting(false)
      return true
    }
  }

  return {
    categories,
    incomeSources,
    submitMovementSheet,
    submitSalarySheet,
  }
}
