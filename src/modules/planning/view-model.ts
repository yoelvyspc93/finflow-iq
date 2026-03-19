import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import type { WishDraft } from '@/components/planning/planning-sheet-stack'
import type { WishProjection } from '@/modules/wishes/calculations'
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
  if (args.filter === 'all') {
    return args.items
  }

  if (args.filter === 'bought') {
    return args.items.filter((item) => item.wish.isPurchased)
  }

  return args.items.filter((item) => !item.wish.isPurchased)
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
