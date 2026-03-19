import { useEffect, useRef, useState } from 'react'

import type { PlanningSheetKind } from '@/components/planning/planning-sheet-stack'
import { usePlanningCommitments } from '@/hooks/planning/use-planning-commitments'
import { usePlanningWishes } from '@/hooks/planning/use-planning-wishes'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCommitmentStore } from '@/stores/commitment-store'
import { usePlanningStore } from '@/stores/planning-store'

export type PlanningView = 'desires' | 'commitments'

export function usePlanningScreen(viewParam?: string | string[]) {
  const lastHandledViewParam = useRef<string | undefined>(undefined)
  const [view, setView] = useState<PlanningView>('desires')
  const [sheet, setSheet] = useState<PlanningSheetKind>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useAuthStore((state) => state.user)
  const settings = useAppStore((state) => state.settings)
  const wallets = useAppStore((state) => state.wallets)
  const selectedWalletId = useAppStore((state) => state.selectedWalletId)
  const overview = usePlanningStore((state) => state.overview)
  const error = usePlanningStore((state) => state.error)
  const isLoading = usePlanningStore((state) => state.isLoading)
  const isReady = usePlanningStore((state) => state.isReady)
  const refreshPlanningData = usePlanningStore(
    (state) => state.refreshPlanningData,
  )
  const wishProjections = usePlanningStore((state) => state.wishProjections)
  const refreshCommitmentData = useCommitmentStore(
    (state) => state.refreshCommitmentData,
  )
  const recurringExpenses = useCommitmentStore(
    (state) => state.recurringExpenses,
  )
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions)
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
      settings,
      userId: user.id,
      wallets,
    })
  }, [refreshPlanningData, settings, user?.id, wallets])

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return
    }

    void refreshCommitmentData({
      month: currentMonth,
      userId: user.id,
      walletId: selectedWalletId,
    })
  }, [currentMonth, refreshCommitmentData, selectedWalletId, user?.id])

  async function refreshAll() {
    if (!user?.id || !settings) {
      return
    }

    await refreshPlanningData({
      settings,
      userId: user.id,
      wallets: useAppStore.getState().wallets,
    })
  }

  const wishes = usePlanningWishes({
    assignableAmount: overview?.assignableAmount ?? 0,
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
    currentMonth,
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
    actionTip: wishes.actionTip,
    budgetProvisions,
    closeSheet,
    commitmentDraft: commitments.commitmentDraft,
    commitmentError: commitments.commitmentError,
    commitmentOpen: commitments.commitmentOpen,
    error,
    filter: wishes.filter,
    filteredWishes: wishes.filteredWishes,
    handleCreateCommitment: commitments.handleCreateCommitment,
    handleCreateWish: wishes.handleCreateWish,
    isCommitmentSubmitting: commitments.isCommitmentSubmitting,
    isLoading,
    isReady,
    isSubmitting,
    openCommitmentSheet: commitments.openCommitmentSheet,
    openWishSheet: wishes.openWishSheet,
    pickerOpen,
    recurringExpenses,
    selectedWalletId,
    setCommitmentDraft: commitments.setCommitmentDraft,
    setCommitmentOpen: commitments.setCommitmentOpen,
    setFilter: wishes.setFilter,
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
