import type {
  FinancesDraft,
  FinancesFormSheetMode,
} from '@/components/finances/finances-form-sheet'
import { getSalaryPeriodPendingAmount } from '@/modules/salary/calculations'
import type { SalaryCurrency, SalaryPeriod } from '@/modules/salary/types'
import type { Wallet } from '@/modules/wallets/types'

export type FinancesSheetMode = 'quick' | FinancesFormSheetMode

export type FinancesQuickActionTone = 'red' | 'green' | 'orange' | 'blue'

export type FinancesQuickActionDescriptor = {
  icon:
    | 'arrow-up-right'
    | 'arrow-down-left'
    | 'repeat'
    | 'calendar-outline'
    | 'wallet-outline'
  label: string
  sheet: Exclude<FinancesFormSheetMode, null>
  tone: FinancesQuickActionTone
}

const FINANCES_QUICK_ACTIONS: FinancesQuickActionDescriptor[] = [
  {
    icon: 'arrow-up-right',
    label: 'Registrar Gasto',
    sheet: 'expense',
    tone: 'red',
  },
  {
    icon: 'arrow-down-left',
    label: 'Registrar Ingreso',
    sheet: 'income',
    tone: 'green',
  },
  {
    icon: 'repeat',
    label: 'Transferir Moneda',
    sheet: 'transfer',
    tone: 'orange',
  },
  {
    icon: 'calendar-outline',
    label: 'Registrar Nomina',
    sheet: 'salary-period',
    tone: 'blue',
  },
  {
    icon: 'wallet-outline',
    label: 'Registrar Salario',
    sheet: 'salary-payment',
    tone: 'blue',
  },
]

const FORM_TITLE_BY_SHEET: Record<Exclude<FinancesFormSheetMode, null>, string> = {
  expense: 'Registrar Gastos',
  income: 'Registrar Ingreso',
  'salary-payment': 'Registrar Salario',
  'salary-period': 'Registrar Nomina',
  transfer: 'Transferir',
}

const SUBMIT_LABEL_BY_SHEET: Record<Exclude<FinancesFormSheetMode, null>, string> = {
  expense: 'Guardar Gasto',
  income: 'Guardar Ingreso',
  'salary-payment': 'Guardar Salario',
  'salary-period': 'Guardar Nomina',
  transfer: 'Guardar Transferencia',
}

export function asSalaryCurrency(value: string | null): SalaryCurrency | null {
  return value === 'USD' || value === 'CUP' ? value : null
}

export function createInitialFinancesDraft(today: string): FinancesDraft {
  return {
    amount: '',
    categoryId: null,
    date: today,
    description: '',
    destinationAmount: '',
    destinationWalletId: null,
    incomeSourceId: null,
    rate: '1',
  }
}

export function resolveActiveFinancesFormSheet(
  sheet: FinancesSheetMode,
): FinancesFormSheetMode {
  return sheet === 'expense' ||
    sheet === 'income' ||
    sheet === 'transfer' ||
    sheet === 'salary-payment' ||
    sheet === 'salary-period'
    ? sheet
    : null
}

export function getFinancesFormCopy(sheet: FinancesFormSheetMode) {
  if (!sheet) {
    return { submitLabel: 'Guardar', title: '' }
  }

  return {
    submitLabel: SUBMIT_LABEL_BY_SHEET[sheet],
    title: FORM_TITLE_BY_SHEET[sheet],
  }
}

export function getTransferDestinationWalletId(args: {
  activeWalletCurrency: string | null | undefined
  selectedWalletId: string | null
  wallets: Wallet[]
}) {
  return (
    args.wallets.find(
      (wallet) =>
        wallet.id !== args.selectedWalletId &&
        wallet.isActive &&
        wallet.currency !== args.activeWalletCurrency,
    )?.id ?? null
  )
}

export function buildFinancesDraftForSheet(args: {
  activeWalletCurrency: string | null | undefined
  currentDraft: FinancesDraft
  sheet: FinancesSheetMode
  today: string
  selectedWalletId: string | null
  wallets: Wallet[]
}): FinancesDraft {
  return {
    ...args.currentDraft,
    amount: '',
    date: args.sheet === 'salary-period' ? `${args.today.slice(0, 7)}-01` : args.today,
    description: '',
    destinationAmount: '',
    destinationWalletId:
      args.sheet === 'transfer'
        ? getTransferDestinationWalletId({
            activeWalletCurrency: args.activeWalletCurrency,
            selectedWalletId: args.selectedWalletId,
            wallets: args.wallets,
          })
        : null,
    rate: '1',
  }
}

export function getVisibleSalaryPeriods(args: {
  activeWalletCurrency: string | null | undefined
  salaryPeriods: SalaryPeriod[]
}) {
  const currency = asSalaryCurrency(args.activeWalletCurrency ?? null)
  return currency
    ? args.salaryPeriods.filter((period) => period.currency === currency)
    : []
}

export function summarizeSalaryPeriods(periods: SalaryPeriod[]) {
  return {
    pendingMonths: periods.filter((period) => period.status !== 'covered').length,
    pendingSalary: periods.reduce(
      (total, period) => total + getSalaryPeriodPendingAmount(period),
      0,
    ),
  }
}

export function getFinancesQuickActionDescriptors() {
  return FINANCES_QUICK_ACTIONS
}
