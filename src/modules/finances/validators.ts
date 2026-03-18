import type { FinancesDraft } from '@/components/finances/finances-form-sheet'

export function validateFinancesBaseSubmit(args: {
  amountText: string
  selectedWalletId: string | null
  userId: string | undefined
}) {
  if (!args.userId || !args.selectedWalletId) {
    return 'Selecciona una wallet valida.'
  }

  const amount = Number(args.amountText)
  if (Number.isNaN(amount) || amount <= 0) {
    return 'El monto debe ser mayor que cero.'
  }

  return null
}

export function validateTransferDraft(args: {
  activeWalletCurrency: string | null | undefined
  draft: FinancesDraft
  wallets: { currency: string; id: string; isActive: boolean }[]
}) {
  if (!args.draft.destinationWalletId) {
    return 'Selecciona una wallet destino.'
  }

  const destinationWallet = args.wallets.find(
    (wallet) => wallet.id === args.draft.destinationWalletId,
  )
  if (
    !destinationWallet ||
    !destinationWallet.isActive ||
    destinationWallet.currency === args.activeWalletCurrency
  ) {
    return 'La transferencia debe ser entre monedas activas diferentes.'
  }

  const destinationAmount = Number(args.draft.destinationAmount || args.draft.amount)
  const rate = Number(args.draft.rate)
  if (
    Number.isNaN(destinationAmount) ||
    destinationAmount <= 0 ||
    Number.isNaN(rate) ||
    rate <= 0
  ) {
    return 'Completa monto destino y tasa validos.'
  }

  return null
}

export function validateSalaryCurrency(currency: string | null) {
  return currency ? null : 'La wallet activa debe ser USD o CUP.'
}

export function validateSalaryPeriodToken(date: string) {
  return /^\d{4}-\d{2}$/.test(date.slice(0, 7))
    ? null
    : 'La fecha del periodo debe tener formato YYYY-MM.'
}
