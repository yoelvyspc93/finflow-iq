import { useMemo, useState } from 'react'

import type { WishProjection } from '@/modules/wishes/calculations'
import { createWish } from '@/modules/wishes/service'
import { createLocalWish } from '@/modules/wishes/types'
import {
  buildPlanningActionTip,
  buildWishDraft,
  filterWishProjectionItems,
  getNextWishAmount,
} from '@/modules/planning/view-model'
import { validateWishSubmit } from '@/modules/planning/validators'
import type { Wallet } from '@/modules/wallets/types'
import type {
  PlanningSheetKind,
  WishDraft,
} from '@/components/planning/planning-sheet-stack'

export function usePlanningWishes(args: {
  addLocalWish: (wish: ReturnType<typeof createLocalWish>) => void
  assignableAmount: number
  goalShortfall: number
  isDevBypass: boolean
  refreshAll: () => Promise<void>
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  setPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSheet: React.Dispatch<React.SetStateAction<PlanningSheetKind>>
  setSheetError: React.Dispatch<React.SetStateAction<string | null>>
  userId: string | undefined
  wallets: Wallet[]
  wishProjections: WishProjection[]
}) {
  const [wishDraft, setWishDraft] = useState<WishDraft>(() =>
    buildWishDraft({ wallets: args.wallets, wishProjections: args.wishProjections }),
  )

  const [filter, setFilter] = useState<'all' | 'pending' | 'bought'>('all')

  const filteredWishes = useMemo(
    () => filterWishProjectionItems({ filter, items: args.wishProjections }),
    [filter, args.wishProjections],
  )
  const actionTip = useMemo(
    () =>
      buildPlanningActionTip({
        assignableAmount: args.assignableAmount,
        goalShortfall: args.goalShortfall,
        nextWishAmount: getNextWishAmount(args.wishProjections),
      }),
    [args.assignableAmount, args.goalShortfall, args.wishProjections],
  )

  function openWishSheet() {
    setWishDraft(
      buildWishDraft({ wallets: args.wallets, wishProjections: args.wishProjections }),
    )
    args.setPickerOpen(false)
    args.setSheet('wish')
  }

  async function handleCreateWish() {
    const validationError = validateWishSubmit({
      draft: wishDraft,
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
    const estimatedAmount = Number(wishDraft.amount)
    const priority = Number(wishDraft.priority)

    args.setIsSubmitting(true)
    args.setSheetError(null)

    try {
      if (args.isDevBypass) {
        args.addLocalWish(
          createLocalWish({
            estimatedAmount,
            name: wishDraft.name,
            notes: wishDraft.notes || null,
            priority,
            userId,
            walletId: wishDraft.walletId,
          }),
        )
      } else {
        await createWish({
          estimatedAmount,
          name: wishDraft.name,
          notes: wishDraft.notes || null,
          priority,
          userId,
          walletId: wishDraft.walletId,
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
          : 'No se pudo crear el deseo.',
      )
      args.setIsSubmitting(false)
    }
  }

  return {
    actionTip,
    filter,
    filteredWishes,
    handleCreateWish,
    openWishSheet,
    setFilter,
    setWishDraft,
    wishDraft,
  }
}
