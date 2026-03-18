import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import type {
  ContributionDraft,
  GoalDraft,
  WishDraft,
} from '@/components/planning/planning-sheet-stack'

export function validateGoalSubmit(args: {
  draft: GoalDraft
  userId: string | undefined
}) {
  if (!args.userId) {
    return 'No hay sesion activa.'
  }

  if (!args.draft.name.trim()) {
    return 'Escribe un nombre para la meta.'
  }

  const targetAmount = Number(args.draft.targetAmount)
  if (Number.isNaN(targetAmount) || targetAmount <= 0 || !args.draft.walletId) {
    return 'Completa nombre, monto y wallet.'
  }

  return null
}

export function validateContributionSubmit(args: {
  draft: ContributionDraft
  hasSelectedGoal: boolean
  userId: string | undefined
}) {
  if (!args.userId) {
    return 'No hay sesion activa.'
  }

  const amount = Number(args.draft.amount)
  if (!args.hasSelectedGoal || Number.isNaN(amount) || amount <= 0) {
    return 'Selecciona una meta valida y un monto mayor que cero.'
  }

  return null
}

export function validateWishSubmit(args: {
  draft: WishDraft
  userId: string | undefined
}) {
  if (!args.userId) {
    return 'No hay sesion activa.'
  }

  const estimatedAmount = Number(args.draft.amount)
  const priority = Number(args.draft.priority)
  if (
    !args.draft.name.trim() ||
    Number.isNaN(estimatedAmount) ||
    estimatedAmount <= 0 ||
    Number.isNaN(priority) ||
    priority <= 0 ||
    !args.draft.walletId
  ) {
    return 'Completa nombre, monto, prioridad y wallet.'
  }

  return null
}

export function validateCommitmentSubmit(args: {
  draft: PlanningCommitmentDraft
  userId: string | undefined
}) {
  if (!args.userId) {
    return 'No hay sesion activa.'
  }

  const amount = Number(args.draft.amount)
  if (
    !args.draft.name.trim() ||
    Number.isNaN(amount) ||
    amount <= 0 ||
    !args.draft.walletId
  ) {
    return 'Completa nombre, monto y wallet.'
  }

  return null
}

export function validateCommitmentFixedDay(day: string) {
  const billingDay = Number(day)
  return Number.isNaN(billingDay) || billingDay < 1 || billingDay > 31
    ? 'El dia de cobro debe ser entre 1 y 31.'
    : null
}

export function validateCommitmentEventMonth(month: string) {
  return /^\d{4}-\d{2}-01$/.test(`${month.slice(0, 7)}-01`)
    ? null
    : 'El mes debe tener formato YYYY-MM.'
}
