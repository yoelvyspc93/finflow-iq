import { useEffect, useState } from 'react'

import type { MovementFilterMode } from '@/components/finances/movement-section-list'
import { selectActiveWallet } from '@/modules/ledger/selectors'
import {
  asSalaryCurrency,
  createInitialFinancesDraft,
} from '@/modules/finances/view-model'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useExchangeStore } from '@/stores/exchange-store'
import { useLedgerStore } from '@/stores/ledger-store'
import { useSalaryStore } from '@/stores/salary-store'
import { usePlanningStore } from '@/stores/planning-store'
import { useFinancesMovements } from '@/hooks/finances/use-finances-movements'
import { useFinancesQuickActions } from '@/hooks/finances/use-finances-quick-actions'
import { useFinancesSalary } from '@/hooks/finances/use-finances-salary'

export type FinancesViewMode = 'movements' | 'salary'
export type FinancesFilterMode = MovementFilterMode

export function useFinancesScreen() {
  const [view, setView] = useState<FinancesViewMode>('movements')
  const [filter, setFilter] = useState<FinancesFilterMode>('all')

  const user = useAuthStore((state) => state.user)
  const wallets = useAppStore((state) => state.wallets)
  const selectedWalletId = useAppStore((state) => state.selectedWalletId)
  const refreshAppData = useAppStore((state) => state.refreshAppData)
  const activeWallet = selectActiveWallet(wallets, selectedWalletId)
  const ledgerEntries = useLedgerStore((state) => state.entries)
  const refreshLedger = useLedgerStore((state) => state.refreshLedger)
  const refreshExchangeData = useExchangeStore(
    (state) => state.refreshExchangeData,
  )
  const refreshSalaryData = useSalaryStore((state) => state.refreshSalaryData)
  const salaryPeriods = useSalaryStore((state) => state.periods)
  const settings = useAppStore((state) => state.settings)
  const refreshPlanningData = usePlanningStore(
    (state) => state.refreshPlanningData,
  )

  const quickActions = useFinancesQuickActions({
    activeWalletCurrency: activeWallet?.currency,
    initialDraft: createInitialFinancesDraft(new Date().toISOString().slice(0, 10)),
    selectedWalletId,
    wallets,
  })

  const salary = useFinancesSalary({
    activeWalletCurrency: activeWallet?.currency,
    salaryPeriods,
  })

  async function syncAll() {
    if (!user?.id || !selectedWalletId) return

    await Promise.all([
      refreshAppData({ userId: user.id }),
      refreshLedger({
        userId: user.id,
        walletId: selectedWalletId,
      }),
      refreshExchangeData({ userId: user.id }),
      refreshSalaryData({ userId: user.id }),
    ])

    if (settings) {
      await refreshPlanningData({
        settings,
        userId: user.id,
        wallets: useAppStore.getState().wallets,
      })
    }
  }

  const movements = useFinancesMovements({
    activeWalletCurrency: activeWallet?.currency,
    draft: quickActions.draft,
    selectedWalletId,
    setDraft: quickActions.setDraft,
    setError: quickActions.setError,
    setIsSubmitting: quickActions.setIsSubmitting,
    syncAll,
    userId: user?.id,
    visiblePeriods: salary.visiblePeriods,
    wallets,
  })

  useEffect(() => {
    if (!user?.id || !selectedWalletId) return
    void Promise.all([
      refreshLedger({
        userId: user.id,
        walletId: selectedWalletId,
      }),
      refreshExchangeData({ userId: user.id }),
      refreshSalaryData({ userId: user.id }),
    ])
  }, [
    refreshExchangeData,
    refreshLedger,
    refreshSalaryData,
    selectedWalletId,
    user?.id,
  ])

  async function submitSheet() {
    const movementHandled = await movements.submitMovementSheet(
      quickActions.activeFormSheet,
    )
    if (movementHandled) {
      if (!quickActions.error) {
        quickActions.setSheet(null)
      }
      return
    }

    const salaryHandled = await movements.submitSalarySheet({
      salaryCurrency: asSalaryCurrency(activeWallet?.currency ?? null),
      sheet: quickActions.activeFormSheet,
    })
    if (salaryHandled && !quickActions.error) {
      quickActions.setSheet(null)
    }
  }

  return {
    activeFormSheet: quickActions.activeFormSheet,
    activeWallet,
    activeCategories: movements.activeCategories,
    activeIncomeSources: movements.activeIncomeSources,
    categories: movements.categories,
    closeFormSheet: quickActions.closeFormSheet,
    closeQuickSheet: quickActions.closeQuickSheet,
    draft: quickActions.draft,
    error: quickActions.error,
    filter,
    formTitle: quickActions.formTitle,
    incomeSources: movements.incomeSources,
    isSubmitting: quickActions.isSubmitting,
    ledgerEntries,
    pendingMonths: salary.pendingMonths,
    pendingSalary: salary.pendingSalary,
    quickItems: quickActions.quickItems,
    selectedWalletId,
    setDraft: quickActions.setDraft,
    setFilter,
    setSheet: quickActions.setSheet,
    setView,
    sheet: quickActions.sheet,
    submitLabel: quickActions.submitLabel,
    submitSheet,
    view,
    visiblePeriods: salary.visiblePeriods,
    wallets,
  }
}
