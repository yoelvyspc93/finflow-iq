import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import type { WishPurchaseDraft } from '@/components/planning/wish-purchase-sheet'
import type { WishDraft } from '@/components/planning/planning-sheet-stack'
import type { WishProjection } from '@/modules/wishes/calculations'
import type { Wish } from '@/modules/wishes/types'
import type { Wallet } from '@/modules/wallets/types'

export function buildPlanningActionTip(args: {
  assignableAmount: number
  nextWishAmount: number | null
}) {
  if (
    args.nextWishAmount !== null &&
    args.assignableAmount >= args.nextWishAmount
  ) {
    return 'Tu primera prioridad ya cabe en el dinero asignable actual.'
  }

  if (args.assignableAmount > 0) {
    return `Tienes ${args.assignableAmount.toFixed(0)} disponibles para adelantar deseos sin comprometer tu reserva.`
  }

  return 'Conviene mantener el foco en ahorro estable antes de subir nuevas prioridades.'
}

export function filterWishProjectionItems(args: {
  filter: 'all' | 'pending' | 'bought'
  items: WishProjection[]
}) {
  const filtered =
    args.filter === 'all'
      ? args.items
      : args.filter === 'bought'
        ? args.items.filter((item) => item.wish.isPurchased)
        : args.items.filter((item) => !item.wish.isPurchased)

  return [...filtered].sort((left, right) => {
    if (left.wish.isPurchased !== right.wish.isPurchased) {
      return left.wish.isPurchased ? 1 : -1
    }

    const leftDate = left.wish.isPurchased
      ? left.wish.purchasedAt?.slice(0, 10) ?? '9999-12-31'
      : left.estimatedPurchaseDate ?? '9999-12-31'
    const rightDate = right.wish.isPurchased
      ? right.wish.purchasedAt?.slice(0, 10) ?? '9999-12-31'
      : right.estimatedPurchaseDate ?? '9999-12-31'

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }

    return left.wish.priority - right.wish.priority
  })
}

export function getNextWishAmount(items: WishProjection[]) {
  return (
    items.find((projection) => !projection.wish.isPurchased)?.wish
      .estimatedAmount ?? null
  )
}

export function getNextWishPriority(items: WishProjection[]) {
  return String(
    items.reduce(
      (highest, projection) => Math.max(highest, projection.wish.priority),
      0,
    ) + 1 || 1,
  )
}

export function buildWishDraft(args: {
  wallets: Wallet[]
  wishProjections: WishProjection[]
}): WishDraft {
  return {
    amount: '',
    name: '',
    notes: '',
    priority: getNextWishPriority(args.wishProjections),
    walletId: args.wallets.find((wallet) => wallet.isActive)?.id ?? '',
  }
}

export function buildCommitmentDraft(args: {
  selectedWalletId: string | null
  wallets: Wallet[]
}): PlanningCommitmentDraft {
  return {
    amount: '',
    day: String(new Date().getUTCDate()).padStart(2, '0'),
    kind: 'fixed',
    month: new Date().toISOString().slice(0, 7),
    name: '',
    notes: '',
    walletId:
      args.selectedWalletId ?? args.wallets.find((wallet) => wallet.isActive)?.id ?? '',
  }
}

export function buildWishPurchaseDraft(wish: Wish): WishPurchaseDraft {
  return {
    amount: String(wish.estimatedAmount),
    categoryId: null,
    date: new Date().toISOString().slice(0, 10),
    description: wish.name,
  }
}
