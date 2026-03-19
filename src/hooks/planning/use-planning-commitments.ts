import { useState } from 'react'

import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import { createRecurringExpense } from '@/modules/commitments/service'
import { createBudgetProvision } from '@/modules/provisions/service'
import { buildCommitmentDraft } from '@/modules/planning/view-model'
import {
  validateCommitmentEventMonth,
  validateCommitmentFixedDay,
  validateCommitmentSubmit,
} from '@/modules/planning/validators'
import type { Wallet } from '@/modules/wallets/types'

export function usePlanningCommitments(args: {
  currentMonth: string
  refreshCommitmentData: (args: {
    month: string
    userId: string
    walletId: string
  }) => Promise<void>
  selectedWalletId: string | null
  setPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  userId: string | undefined
  wallets: Wallet[]
}) {
  const [commitmentDraft, setCommitmentDraft] = useState<PlanningCommitmentDraft>(() =>
    buildCommitmentDraft({
      selectedWalletId: args.selectedWalletId,
      wallets: args.wallets,
    }),
  )
  const [commitmentOpen, setCommitmentOpen] = useState(false)
  const [commitmentError, setCommitmentError] = useState<string | null>(null)
  const [isCommitmentSubmitting, setIsCommitmentSubmitting] = useState(false)

  function openCommitmentSheet() {
    args.setPickerOpen(false)
    setCommitmentError(null)
    setIsCommitmentSubmitting(false)
    setCommitmentDraft(
      buildCommitmentDraft({
        selectedWalletId: args.selectedWalletId,
        wallets: args.wallets,
      }),
    )
    setCommitmentOpen(true)
  }

  async function handleCreateCommitment() {
    const validationError = validateCommitmentSubmit({
      draft: commitmentDraft,
      userId: args.userId,
    })
    if (validationError) {
      setCommitmentError(validationError)
      return
    }
    const userId = args.userId
    if (!userId) {
      return
    }
    const amount = Number(commitmentDraft.amount)
    const targetMonth = `${commitmentDraft.month.slice(0, 7)}-01`

    setIsCommitmentSubmitting(true)
    setCommitmentError(null)

    try {
      if (commitmentDraft.kind === 'fixed') {
        const fixedDayError = validateCommitmentFixedDay(commitmentDraft.day)
        if (fixedDayError) {
          setCommitmentError(fixedDayError)
          setIsCommitmentSubmitting(false)
          return
        }
        const billingDay = Number(commitmentDraft.day)

        await createRecurringExpense({
          amount,
          billingDay,
          categoryId: null,
          frequency: 'monthly',
          name: commitmentDraft.name,
          notes: commitmentDraft.notes || undefined,
          type: 'fixed_expense',
          walletId: commitmentDraft.walletId,
        })
      } else {
        const eventMonthError = validateCommitmentEventMonth(commitmentDraft.month)
        if (eventMonthError) {
          setCommitmentError(eventMonthError)
          setIsCommitmentSubmitting(false)
          return
        }

        await createBudgetProvision({
          amount,
          categoryId: null,
          month: targetMonth,
          name: commitmentDraft.name,
          notes: commitmentDraft.notes || undefined,
          recurrence: 'once',
          walletId: commitmentDraft.walletId,
        })
      }

      await args.refreshCommitmentData({
        month: args.currentMonth,
        userId,
        walletId: args.selectedWalletId ?? commitmentDraft.walletId,
      })
      setCommitmentOpen(false)
      setIsCommitmentSubmitting(false)
    } catch (submitError) {
      setCommitmentError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el compromiso.',
      )
      setIsCommitmentSubmitting(false)
    }
  }

  return {
    commitmentDraft,
    commitmentError,
    commitmentOpen,
    handleCreateCommitment,
    isCommitmentSubmitting,
    openCommitmentSheet,
    setCommitmentDraft,
    setCommitmentOpen,
  }
}
