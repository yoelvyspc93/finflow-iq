import type { PlanningCommitmentDraft } from '@/components/planning/commitment-sheet'
import type { WishDraft } from '@/components/planning/planning-sheet-stack'
import type { WishPurchaseDraft } from '@/components/planning/wish-purchase-sheet'

export function validateWishSubmit(args: {
  draft: WishDraft
  userId: string | undefined
}) {
  if (!args.userId) {
    return 'No hay una sesión activa.'
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
    return 'Completa el nombre, el monto, la prioridad y la billetera.'
  }

  return null
}

export function validateCommitmentSubmit(args: {
  draft: PlanningCommitmentDraft
  userId: string | undefined
}) {
  if (!args.userId) {
    return 'No hay una sesión activa.'
  }

  const amount = Number(args.draft.amount)
  if (
    !args.draft.name.trim() ||
    Number.isNaN(amount) ||
    amount <= 0 ||
    !args.draft.walletId
  ) {
    return 'Completa el nombre, el monto y la billetera.'
  }

  return null
}

export function validateCommitmentFixedDay(day: string) {
  const billingDay = Number(day)
  return Number.isNaN(billingDay) || billingDay < 1 || billingDay > 31
    ? 'El día de pago debe estar entre 1 y 31.'
    : null
}

export function validateCommitmentEventMonth(month: string) {
  return /^\d{4}-\d{2}-01$/.test(`${month.slice(0, 7)}-01`)
    ? null
    : 'El mes debe tener el formato AAAA-MM.'
}

export function validateWishPurchaseSubmit(args: {
  draft: WishPurchaseDraft
  userId: string | undefined
  wishId: string | null
  walletId: string | null
}) {
  if (!args.userId) {
    return 'No hay una sesión activa.'
  }

  const amount = Number(args.draft.amount)
  if (
    !args.wishId ||
    !args.walletId ||
    Number.isNaN(amount) ||
    amount <= 0 ||
    !args.draft.description.trim()
  ) {
    return 'Completa el monto, la descripción y el deseo a comprar.'
  }

  return null
}
