import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import type {
  ContributionDraft,
  GoalDraft,
  WishDraft,
} from '@/components/planning/planning-sheet-stack'
import type { GoalProgressSnapshot } from '@/modules/goals/calculations'
import type { WishProjection } from '@/modules/wishes/calculations'
import type { Wallet } from '@/modules/wallets/types'

export function buildPlanningActionTip(args: {
  assignableAmount: number
  goalShortfall: number
  nextWishAmount: number | null
}) {
  if (args.assignableAmount > 0 && args.goalShortfall > 0) {
    return `Tienes margen para mover ${args.assignableAmount.toFixed(0)} a metas sin tocar tu reserva.`
  }

  if (
    args.nextWishAmount !== null &&
    args.assignableAmount >= args.nextWishAmount
  ) {
    return 'Tu primera prioridad ya cabe en el dinero asignable actual.'
  }

  return 'Conviene mantener el foco en ahorro estable antes de subir nuevas prioridades.'
}

export function getActiveGoalSnapshots(goalSnapshots: GoalProgressSnapshot[]) {
  return goalSnapshots.filter(
    (snapshot) =>
      snapshot.goal.status === 'active' || snapshot.status === 'at_risk',
  )
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

export function buildGoalDraft(wallets: Wallet[]): GoalDraft {
  return {
    deadline: '',
    name: '',
    targetAmount: '',
    walletId: wallets.find((wallet) => wallet.isActive)?.id ?? '',
  }
}

export function buildContributionDraft(activeGoals: GoalProgressSnapshot[]): ContributionDraft {
  return {
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    goalId: activeGoals[0]?.goal.id ?? '',
    note: '',
  }
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
