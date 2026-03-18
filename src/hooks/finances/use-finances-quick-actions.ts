import { useState } from 'react'

import type { FinancesDraft } from '@/components/finances/finances-form-sheet'
import {
  buildFinancesDraftForSheet,
  getFinancesFormCopy,
  getFinancesQuickActionDescriptors,
  resolveActiveFinancesFormSheet,
  type FinancesQuickActionDescriptor,
  type FinancesSheetMode,
} from '@/modules/finances/view-model'
import type { Wallet } from '@/modules/wallets/types'

export function useFinancesQuickActions(args: {
  activeWalletCurrency: string | null | undefined
  initialDraft: FinancesDraft
  selectedWalletId: string | null
  wallets: Wallet[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [sheet, setSheet] = useState<FinancesSheetMode>(null)
  const [draft, setDraft] = useState<FinancesDraft>(args.initialDraft)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeFormSheet = resolveActiveFinancesFormSheet(sheet)
  const { submitLabel, title } = getFinancesFormCopy(activeFormSheet)

  function openSheet(next: FinancesSheetMode) {
    setError(null)
    setIsSubmitting(false)
    setDraft((current) =>
      buildFinancesDraftForSheet({
        activeWalletCurrency: args.activeWalletCurrency,
        currentDraft: current,
        selectedWalletId: args.selectedWalletId,
        sheet: next,
        today,
        wallets: args.wallets,
      }),
    )
    setSheet(next)
  }

  function closeQuickSheet() {
    setSheet((current) => (current === 'quick' ? null : current))
  }

  function closeFormSheet() {
    setSheet((current) => resolveActiveFinancesFormSheet(current) ? null : current)
  }

  const quickItems: (FinancesQuickActionDescriptor & { onPress: () => void })[] =
    getFinancesQuickActionDescriptors().map((item) => ({
      ...item,
      onPress: () => openSheet(item.sheet),
    }))

  return {
    activeFormSheet,
    closeFormSheet,
    closeQuickSheet,
    draft,
    error,
    formTitle: title,
    isSubmitting,
    openSheet,
    quickItems,
    setDraft,
    setError,
    setIsSubmitting,
    setSheet,
    sheet,
    submitLabel,
  }
}
