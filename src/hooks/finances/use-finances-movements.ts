import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'

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

export type FinancesSubmitResult = {
  errorMessage: string | null
  handled: boolean
  success: boolean
}

const UNHANDLED_RESULT: FinancesSubmitResult = {
  errorMessage: null,
  handled: false,
  success: false,
}

function successResult(): FinancesSubmitResult {
  return {
    errorMessage: null,
    handled: true,
    success: true,
  }
}

function errorResult(errorMessage: string): FinancesSubmitResult {
  return {
    errorMessage,
    handled: true,
    success: false,
  }
}

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
  const [activeCategories, setActiveCategories] = useState<Category[]>([])
  const [activeIncomeSources, setActiveIncomeSources] = useState<IncomeSource[]>([])
  const { setDraft, userId } = args

  const loadReferenceData = useCallback(() => {
    if (!userId) {
      setCategories([])
      setIncomeSources([])
      setActiveCategories([])
      setActiveIncomeSources([])
      return
    }

    void Promise.all([
      listCategories({ includeInactive: true, userId }),
      listIncomeSources({ includeInactive: true, userId }),
      listCategories({ userId }),
      listIncomeSources({ userId }),
    ]).then(([nextCategories, nextIncomeSources, nextActiveCategories, nextActiveIncomeSources]) => {
      setCategories(nextCategories)
      setIncomeSources(nextIncomeSources)
      setActiveCategories(nextActiveCategories)
      setActiveIncomeSources(nextActiveIncomeSources)
      setDraft((current) => ({
        ...current,
        categoryId:
          current.categoryId && nextActiveCategories.some((item) => item.id === current.categoryId)
            ? current.categoryId
            : nextActiveCategories[0]?.id ?? null,
        incomeSourceId:
          current.incomeSourceId &&
          nextActiveIncomeSources.some((item) => item.id === current.incomeSourceId)
            ? current.incomeSourceId
            : nextActiveIncomeSources[0]?.id ?? null,
      }))
    })
  }, [setDraft, userId])

  useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  useFocusEffect(
    useCallback(() => {
      loadReferenceData()
    }, [loadReferenceData]),
  )

  async function submitMovementSheet(
    sheet: FinancesFormSheetMode,
  ): Promise<FinancesSubmitResult> {
    const baseValidationError = validateFinancesBaseSubmit({
      amountText: args.draft.amount,
      selectedWalletId: args.selectedWalletId,
      userId: args.userId,
    })
    if (baseValidationError) {
      args.setError(baseValidationError)
      return errorResult(baseValidationError)
    }

    const userId = args.userId
    const selectedWalletId = args.selectedWalletId
    if (!userId || !selectedWalletId) {
      const message = 'Selecciona una billetera válida.'
      args.setError(message)
      return errorResult(message)
    }

    const amount = Number(args.draft.amount)

    if (sheet !== 'expense' && sheet !== 'income' && sheet !== 'transfer') {
      return UNHANDLED_RESULT
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
          return errorResult(transferValidationError)
        }

        const destinationWalletId = args.draft.destinationWalletId
        if (!destinationWalletId) {
          const message = 'Selecciona una billetera de destino.'
          args.setError(message)
          args.setIsSubmitting(false)
          return errorResult(message)
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
      return successResult()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo completar la acción.'
      args.setError(message)
      args.setIsSubmitting(false)
      return errorResult(message)
    }
  }

  async function submitSalarySheet(argsForSalary: {
    sheet: FinancesFormSheetMode
    salaryCurrency: SalaryCurrency | null
  }): Promise<FinancesSubmitResult> {
    const baseValidationError = validateFinancesBaseSubmit({
      amountText: args.draft.amount,
      selectedWalletId: args.selectedWalletId,
      userId: args.userId,
    })
    if (baseValidationError) {
      args.setError(baseValidationError)
      return errorResult(baseValidationError)
    }

    const selectedWalletId = args.selectedWalletId
    if (!selectedWalletId) {
      const message = 'Selecciona una billetera válida.'
      args.setError(message)
      return errorResult(message)
    }

    const amount = Number(args.draft.amount)
    const { salaryCurrency, sheet } = argsForSalary
    if (sheet !== 'salary-period' && sheet !== 'salary-payment') {
      return UNHANDLED_RESULT
    }

    const salaryCurrencyError = validateSalaryCurrency(salaryCurrency)
    if (salaryCurrencyError) {
      args.setError(salaryCurrencyError)
      return errorResult(salaryCurrencyError)
    }

    if (!salaryCurrency) {
      return errorResult('La billetera activa debe ser USD o CUP.')
    }

    args.setIsSubmitting(true)
    args.setError(null)

    try {
      if (sheet === 'salary-period') {
        const periodValidationError = validateSalaryPeriodToken(args.draft.date)
        if (periodValidationError) {
          args.setError(periodValidationError)
          args.setIsSubmitting(false)
          return errorResult(periodValidationError)
        }

        const periodToken = args.draft.date.slice(0, 7)
        const periodMonth = `${periodToken}-01`
        await createSalaryPeriod({
          currency: salaryCurrency,
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
          currency: salaryCurrency,
          description: args.draft.description || undefined,
          paymentDate: args.draft.date,
          walletId: selectedWalletId,
        })
        await args.syncAll()
      }

      args.setIsSubmitting(false)
      return successResult()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo completar la acción.'
      args.setError(message)
      args.setIsSubmitting(false)
      return errorResult(message)
    }
  }

  return {
    activeCategories,
    activeIncomeSources,
    categories,
    incomeSources,
    submitMovementSheet,
    submitSalarySheet,
  }
}
