import { useMemo } from 'react'

import type { SalaryPeriod } from '@/modules/salary/types'
import {
  getVisibleSalaryPeriods,
  summarizeSalaryPeriods,
} from '@/modules/finances/view-model'

export function useFinancesSalary(args: {
  activeWalletCurrency: string | null | undefined
  salaryPeriods: SalaryPeriod[]
}) {
  const visiblePeriods = useMemo(
    () =>
      getVisibleSalaryPeriods({
        activeWalletCurrency: args.activeWalletCurrency,
        salaryPeriods: args.salaryPeriods,
      }),
    [args.activeWalletCurrency, args.salaryPeriods],
  )

  const summary = useMemo(
    () => summarizeSalaryPeriods(visiblePeriods),
    [visiblePeriods],
  )

  return {
    pendingMonths: summary.pendingMonths,
    pendingSalary: summary.pendingSalary,
    visiblePeriods,
  }
}
