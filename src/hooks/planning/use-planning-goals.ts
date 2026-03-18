import { useMemo, useState } from 'react'

import type { GoalProgressSnapshot } from '@/modules/goals/calculations'
import { addGoalContribution, createGoal } from '@/modules/goals/service'
import {
  createLocalGoal,
  createLocalGoalContribution,
} from '@/modules/goals/types'
import { createLocalLedgerEntry } from '@/modules/ledger/types'
import {
  buildContributionDraft,
  buildGoalDraft,
  getActiveGoalSnapshots,
} from '@/modules/planning/view-model'
import {
  validateContributionSubmit,
  validateGoalSubmit,
} from '@/modules/planning/validators'
import type { Wallet } from '@/modules/wallets/types'
import type {
  ContributionDraft,
  GoalDraft,
  PlanningSheetKind,
} from '@/components/planning/planning-sheet-stack'

export function usePlanningGoals(args: {
  addLocalEntry: (entry: ReturnType<typeof createLocalLedgerEntry>) => void
  addLocalGoal: (goal: ReturnType<typeof createLocalGoal>) => void
  addLocalGoalContribution: (
    contribution: ReturnType<typeof createLocalGoalContribution>,
  ) => void
  applyWalletBalanceDelta: (args: { amount: number; walletId: string }) => void
  goalSnapshots: GoalProgressSnapshot[]
  isDevBypass: boolean
  refreshAll: () => Promise<void>
  refreshAppData: (args: { isDevBypass: boolean; userId: string }) => Promise<void>
  refreshLedger: (args: {
    isDevBypass: boolean
    userId: string
    walletId: string
  }) => Promise<void>
  selectedWalletId: string | null
  setPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSheet: React.Dispatch<React.SetStateAction<PlanningSheetKind>>
  setSheetError: React.Dispatch<React.SetStateAction<string | null>>
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  userId: string | undefined
  wallets: Wallet[]
}) {
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(() => buildGoalDraft(args.wallets))
  const [contributionDraft, setContributionDraft] = useState<ContributionDraft>(() =>
    buildContributionDraft(getActiveGoalSnapshots(args.goalSnapshots)),
  )

  const activeGoals = useMemo(
    () => getActiveGoalSnapshots(args.goalSnapshots),
    [args.goalSnapshots],
  )

  function openGoalSheet() {
    setGoalDraft(buildGoalDraft(args.wallets))
    args.setPickerOpen(false)
    args.setSheet('goal')
  }

  function openContributionSheet(goalId?: string) {
    setContributionDraft({
      ...buildContributionDraft(activeGoals),
      goalId: goalId ?? activeGoals[0]?.goal.id ?? '',
    })
    args.setPickerOpen(false)
    args.setSheet('contribution')
  }

  async function handleCreateGoal() {
    const validationError = validateGoalSubmit({
      draft: goalDraft,
      userId: args.userId,
    })
    if (validationError) {
      args.setSheetError(validationError)
      return
    }
    const userId = args.userId
    if (!userId) {
      return
    }
    const targetAmount = Number(goalDraft.targetAmount)

    args.setIsSubmitting(true)
    args.setSheetError(null)

    try {
      if (args.isDevBypass) {
        args.addLocalGoal(
          createLocalGoal({
            deadline: goalDraft.deadline || null,
            name: goalDraft.name,
            targetAmount,
            userId,
            walletId: goalDraft.walletId,
          }),
        )
      } else {
        await createGoal({
          deadline: goalDraft.deadline || null,
          name: goalDraft.name,
          targetAmount,
          userId,
          walletId: goalDraft.walletId,
        })
      }

      await args.refreshAll()
      args.setSheet(null)
      args.setSheetError(null)
      args.setIsSubmitting(false)
    } catch (submitError) {
      args.setSheetError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear la meta.',
      )
      args.setIsSubmitting(false)
    }
  }

  async function handleCreateContribution() {
    const selectedGoal = activeGoals.find(
      (snapshot) => snapshot.goal.id === contributionDraft.goalId,
    )?.goal

    const validationError = validateContributionSubmit({
      draft: contributionDraft,
      hasSelectedGoal: Boolean(selectedGoal),
      userId: args.userId,
    })
    if (validationError) {
      args.setSheetError(validationError)
      return
    }
    const userId = args.userId
    if (!userId || !selectedGoal) {
      return
    }
    const amount = Number(contributionDraft.amount)

    args.setIsSubmitting(true)
    args.setSheetError(null)

    try {
      if (args.isDevBypass) {
        args.addLocalGoalContribution(
          createLocalGoalContribution({
            amount,
            date: contributionDraft.date,
            goalId: selectedGoal.id,
            note: contributionDraft.note || null,
            userId,
            walletId: selectedGoal.walletId,
          }),
        )
        args.addLocalEntry(
          createLocalLedgerEntry({
            amount: amount * -1,
            date: contributionDraft.date,
            description: contributionDraft.note || selectedGoal.name,
            type: 'goal_deposit',
            userId,
            walletId: selectedGoal.walletId,
          }),
        )
        args.applyWalletBalanceDelta({
          amount: amount * -1,
          walletId: selectedGoal.walletId,
        })
      } else {
        await addGoalContribution({
          amount,
          date: contributionDraft.date,
          goalId: selectedGoal.id,
          note: contributionDraft.note || null,
          walletId: selectedGoal.walletId,
        })
        await args.refreshAppData({ isDevBypass: false, userId })
        if (args.selectedWalletId) {
          await args.refreshLedger({
            isDevBypass: false,
            userId,
            walletId: args.selectedWalletId,
          })
        }
      }

      await args.refreshAll()
      args.setSheet(null)
      args.setSheetError(null)
      args.setIsSubmitting(false)
    } catch (submitError) {
      args.setSheetError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo registrar el aporte.',
      )
      args.setIsSubmitting(false)
    }
  }

  return {
    activeGoals,
    contributionDraft,
    goalDraft,
    handleCreateContribution,
    handleCreateGoal,
    openContributionSheet,
    openGoalSheet,
    setContributionDraft,
    setGoalDraft,
  }
}
