import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'

import type { PlanningSheetKind } from '@/components/planning/planning-sheet-stack'
import type { WishPurchaseDraft } from '@/components/planning/wish-purchase-sheet'
import { listCategories } from '@/modules/categories/service'
import type { Category } from '@/modules/categories/types'
import { usePlanningCommitments } from '@/hooks/planning/use-planning-commitments'
import { usePlanningWishes } from '@/hooks/planning/use-planning-wishes'
import { createWishPurchaseExpense } from '@/modules/ledger/service'
import {
  buildWishPurchaseDraft,
} from '@/modules/planning/view-model'
import { validateWishPurchaseSubmit } from '@/modules/planning/validators'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCommitmentStore } from '@/stores/commitment-store'
import { useLedgerStore } from '@/stores/ledger-store'
import { usePlanningStore } from '@/stores/planning-store'
import type { Wish } from '@/modules/wishes/types'

export type PlanningView = 'desires' | 'commitments'

export function usePlanningScreen(viewParam?: string | string[]) {
  const lastHandledViewParam = useRef<string | undefined>(undefined)
  const [view, setView] = useState<PlanningView>('desires')
  const [sheet, setSheet] = useState<PlanningSheetKind>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [purchaseDraft, setPurchaseDraft] = useState<WishPurchaseDraft>({
    amount: '',
    categoryId: null,
    date: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false)
  const [selectedWishForPurchase, setSelectedWishForPurchase] = useState<Wish | null>(null)

  const user = useAuthStore((state) => state.user)
  const settings = useAppStore((state) => state.settings)
  const wallets = useAppStore((state) => state.wallets)
  const selectedWalletId = useAppStore((state) => state.selectedWalletId)
  const refreshAppData = useAppStore((state) => state.refreshAppData)
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
  const refreshLedger = useLedgerStore((state) => state.refreshLedger)

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

  const loadCategories = useCallback(() => {
    if (!user?.id) {
      setCategories([])
      return
    }

    void listCategories({ userId: user.id }).then((nextCategories) => {
      setCategories(nextCategories)
      setPurchaseDraft((current) => ({
        ...current,
        categoryId:
          current.categoryId && nextCategories.some((item) => item.id === current.categoryId)
            ? current.categoryId
            : nextCategories[0]?.id ?? null,
      }))
    })
  }, [user?.id])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useFocusEffect(
    useCallback(() => {
      loadCategories()
    }, [loadCategories]),
  )

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

  function openWishPurchaseSheet(wish: Wish) {
    setSelectedWishForPurchase(wish)
    setPurchaseDraft({
      ...buildWishPurchaseDraft(wish),
      categoryId: categories[0]?.id ?? null,
    })
    setPurchaseError(null)
    setPurchaseSubmitting(false)
  }

  function closeWishPurchaseSheet() {
    setSelectedWishForPurchase(null)
    setPurchaseError(null)
    setPurchaseSubmitting(false)
  }

  async function submitWishPurchase() {
    const validationError = validateWishPurchaseSubmit({
      draft: purchaseDraft,
      userId: user?.id,
      wishId: selectedWishForPurchase?.id ?? null,
      walletId: selectedWishForPurchase?.walletId ?? null,
    })
    if (validationError) {
      setPurchaseError(validationError)
      return
    }

    if (!user?.id || !settings || !selectedWishForPurchase) {
      return
    }

    setPurchaseSubmitting(true)
    setPurchaseError(null)

    try {
      await createWishPurchaseExpense({
        amount: Number(purchaseDraft.amount),
        categoryId: purchaseDraft.categoryId,
        date: purchaseDraft.date,
        description: purchaseDraft.description || undefined,
        walletId: selectedWishForPurchase.walletId,
        wishId: selectedWishForPurchase.id,
      })

      await refreshAppData({ userId: user.id })

      const latestWallets = useAppStore.getState().wallets
      await Promise.all([
        refreshPlanningData({
          settings,
          userId: user.id,
          wallets: latestWallets,
        }),
        selectedWalletId
          ? refreshLedger({
              userId: user.id,
              walletId: selectedWalletId,
            })
          : Promise.resolve(),
      ])

      closeWishPurchaseSheet()
    } catch (purchaseSubmitError) {
      setPurchaseError(
        purchaseSubmitError instanceof Error
          ? purchaseSubmitError.message
          : 'No se pudo registrar la compra.',
      )
      setPurchaseSubmitting(false)
    }
  }

  return {
    actionTip: wishes.actionTip,
    budgetProvisions,
    categories,
    closeSheet,
    closeWishPurchaseSheet,
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
    openWishPurchaseSheet,
    openWishSheet: wishes.openWishSheet,
    pickerOpen,
    purchaseDraft,
    purchaseError,
    purchaseSubmitting,
    recurringExpenses,
    selectedWishForPurchase,
    selectedWalletId,
    setCommitmentDraft: commitments.setCommitmentDraft,
    setCommitmentOpen: commitments.setCommitmentOpen,
    setFilter: wishes.setFilter,
    setPickerOpen,
    setPurchaseDraft,
    setView,
    setWishDraft: wishes.setWishDraft,
    sheet,
    sheetError,
    submitWishPurchase,
    view,
    wallets,
    wishDraft: wishes.wishDraft,
  }
}
