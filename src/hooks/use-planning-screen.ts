import { useEffect, useMemo, useRef, useState } from 'react'

import type { PlanningSheetKind } from '@/components/planning/planning-sheet-stack'
import { usePlanningCommitments } from '@/hooks/planning/use-planning-commitments'
import { usePlanningGoals } from '@/hooks/planning/use-planning-goals'
import { usePlanningWishes } from '@/hooks/planning/use-planning-wishes'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCommitmentStore } from '@/stores/commitment-store'
import { useLedgerStore } from '@/stores/ledger-store'
import { usePlanningStore } from '@/stores/planning-store'

export type PlanningView = 'desires' | 'commitments'

export function usePlanningScreen(viewParam?: string | string[]) {
  const lastHandledViewParam = useRef<string | undefined>(undefined)
  const [view, setView] = useState<PlanningView>('desires')
  const [sheet, setSheet] = useState<PlanningSheetKind>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isDevBypass = useAuthStore((state) => state.isDevBypass)
  const user = useAuthStore((state) => state.user)
  const settings = useAppStore((state) => state.settings)
  const wallets = useAppStore((state) => state.wallets)
  const selectedWalletId = useAppStore((state) => state.selectedWalletId)
  const applyWalletBalanceDelta = useAppStore(
    (state) => state.applyWalletBalanceDelta,
  )
  const refreshAppData = useAppStore((state) => state.refreshAppData)
  const goalSnapshots = usePlanningStore((state) => state.goalSnapshots)
  const wishProjections = usePlanningStore((state) => state.wishProjections)
  const overview = usePlanningStore((state) => state.overview)
  const error = usePlanningStore((state) => state.error)
  const isLoading = usePlanningStore((state) => state.isLoading)
  const isReady = usePlanningStore((state) => state.isReady)
  const refreshPlanningData = usePlanningStore(
    (state) => state.refreshPlanningData,
  )
  const addLocalGoal = usePlanningStore((state) => state.addLocalGoal)
  const addLocalGoalContribution = usePlanningStore(
    (state) => state.addLocalGoalContribution,
  )
  const addLocalWish = usePlanningStore((state) => state.addLocalWish)
  const addLocalEntry = useLedgerStore((state) => state.addLocalEntry)
  const refreshLedger = useLedgerStore((state) => state.refreshLedger)
  const refreshCommitmentData = useCommitmentStore(
    (state) => state.refreshCommitmentData,
  )
  const recurringExpenses = useCommitmentStore(
    (state) => state.recurringExpenses,
  )
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions)
  const addLocalRecurringExpense = useCommitmentStore(
    (state) => state.addLocalRecurringExpense,
  )
  const addLocalBudgetProvision = useCommitmentStore(
    (state) => state.addLocalBudgetProvision,
  )
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`

  useEffect(() => {
    const requestedView = Array.isArray(viewParam) ? viewParam[0] : viewParam
    if (requestedView === lastHandledViewParam.current) {
      return
    }

    lastHandledViewParam.current = requestedView

    if (requestedView === 'commitments') {
      setView('commitments')
    }
  }, [viewParam])

  useEffect(() => {
    if (!user?.id || !settings) {
      return
    }

    void refreshPlanningData({
      isDevBypass,
      settings,
      userId: user.id,
      wallets,
    })
  }, [isDevBypass, refreshPlanningData, settings, user?.id, wallets])

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return
    }

    void refreshCommitmentData({
      isDevBypass,
      month: currentMonth,
      userId: user.id,
      walletId: selectedWalletId,
    })
  }, [
    currentMonth,
    isDevBypass,
    refreshCommitmentData,
    selectedWalletId,
    user?.id,
  ])

  async function refreshAll() {
    if (!user?.id || !settings) {
      return
    }

    await refreshPlanningData({
      isDevBypass,
      settings,
      userId: user.id,
      wallets: useAppStore.getState().wallets,
    })
  }

  const goals = usePlanningGoals({
    addLocalEntry,
    addLocalGoal,
    addLocalGoalContribution,
    applyWalletBalanceDelta,
    goalSnapshots,
    isDevBypass,
    refreshAll,
    refreshAppData,
    refreshLedger,
    selectedWalletId,
    setPickerOpen,
    setSheet,
    setSheetError,
    setIsSubmitting,
    userId: user?.id,
    wallets,
  })

  const pendingGoalAmount = useMemo(
    () => goals.activeGoals.reduce((total, snapshot) => total + snapshot.remainingAmount, 0),
    [goals.activeGoals],
  )

  const wishes = usePlanningWishes({
    addLocalWish,
    assignableAmount: overview?.assignableAmount ?? 0,
    goalShortfall: pendingGoalAmount,
    isDevBypass,
    refreshAll,
    setIsSubmitting,
    setPickerOpen,
    setSheet,
    setSheetError,
    userId: user?.id,
    wallets,
    wishProjections,
  })

  const commitments = usePlanningCommitments({
    addLocalBudgetProvision,
    addLocalRecurringExpense,
    currentMonth,
    isDevBypass,
    refreshCommitmentData,
    selectedWalletId,
    setPickerOpen,
    userId: user?.id,
    wallets,
  })

  function closeSheet() {
    setSheet(null)
    setSheetError(null)
    setIsSubmitting(false)
  }

  return {
    activeGoals: goals.activeGoals,
    actionTip: wishes.actionTip,
    budgetProvisions,
    closeSheet,
    commitmentDraft: commitments.commitmentDraft,
    commitmentError: commitments.commitmentError,
    commitmentOpen: commitments.commitmentOpen,
    contributionDraft: goals.contributionDraft,
    error,
    filter: wishes.filter,
    filteredWishes: wishes.filteredWishes,
    goalDraft: goals.goalDraft,
    handleCreateCommitment: commitments.handleCreateCommitment,
    handleCreateContribution: goals.handleCreateContribution,
    handleCreateGoal: goals.handleCreateGoal,
    handleCreateWish: wishes.handleCreateWish,
    isCommitmentSubmitting: commitments.isCommitmentSubmitting,
    isLoading,
    isReady,
    isSubmitting,
    openCommitmentSheet: commitments.openCommitmentSheet,
    openContributionSheet: goals.openContributionSheet,
    openGoalSheet: goals.openGoalSheet,
    openWishSheet: wishes.openWishSheet,
    pickerOpen,
    recurringExpenses,
    selectedWalletId,
    setCommitmentDraft: commitments.setCommitmentDraft,
    setCommitmentOpen: commitments.setCommitmentOpen,
    setContributionDraft: goals.setContributionDraft,
    setFilter: wishes.setFilter,
    setGoalDraft: goals.setGoalDraft,
    setPickerOpen,
    setView,
    setWishDraft: wishes.setWishDraft,
    sheet,
    sheetError,
    view,
    wallets,
    wishDraft: wishes.wishDraft,
  }
}
