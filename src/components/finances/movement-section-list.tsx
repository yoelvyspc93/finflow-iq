import { SectionList, StyleSheet, Text, View } from 'react-native'

import { FilterList } from '@/components/ui/filter-list'
import type { Category } from '@/modules/categories/types'
import type { CurrencyExchange } from '@/modules/exchanges/types'
import type { IncomeSource } from '@/modules/income-sources/types'
import type { LedgerEntry } from '@/modules/ledger/types'
import type { Wallet } from '@/modules/wallets/types'
import { theme } from '@/utils/theme'

export type MovementFilterMode = 'all' | 'income' | 'expense' | 'transfer'

type MovementSectionListProps = {
  categories: Category[]
  entries: LedgerEntry[]
  exchanges: CurrencyExchange[]
  filter: MovementFilterMode
  incomeSources: IncomeSource[]
  onFilterChange: (value: string) => void
  wallets: Wallet[]
}

type MovementSection = {
  data: LedgerEntry[]
  title: string
}

function entryKind(type: string) {
  return type === 'income' || type === 'salary_payment'
    ? 'income'
    : type === 'exchange_out' || type === 'exchange_in'
      ? 'transfer'
      : 'expense'
}

function groupLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  const now = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const label = date
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })
    .toUpperCase()
  return value === now
    ? `HOY, ${label}`
    : value === yesterday
      ? `AYER, ${label}`
      : label
}

function buildSections(
  entries: LedgerEntry[],
  filter: MovementFilterMode,
): MovementSection[] {
  const filtered = entries.filter((entry) => {
    if (entry.type === 'exchange_in') {
      return false
    }

    return filter === 'all' || entryKind(entry.type) === filter
  })

  const grouped = filtered.reduce<Record<string, LedgerEntry[]>>((groups, entry) => {
    groups[entry.date] = [...(groups[entry.date] ?? []), entry]
    return groups
  }, {})

  return Object.entries(grouped).map(([title, data]) => ({ data, title }))
}

function resolveTransferContext(
  entry: LedgerEntry,
  exchanges: CurrencyExchange[],
  wallets: Wallet[],
) {
  const exchange = exchanges.find(
    (item) =>
      item.exchangeOutEntryId === entry.id || item.exchangeInEntryId === entry.id,
  )
  if (!exchange) {
    return null
  }

  return {
    destinationWallet: wallets.find((wallet) => wallet.id === exchange.toWalletId) ?? null,
    exchange,
    sourceWallet: wallets.find((wallet) => wallet.id === exchange.fromWalletId) ?? null,
  }
}

function formatEntryTime(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MovementSectionList({
  categories,
  entries,
  exchanges,
  filter,
  incomeSources,
  onFilterChange,
  wallets,
}: MovementSectionListProps) {
  const sections = buildSections(entries, filter)

  return (
    <SectionList
      contentContainerStyle={styles.content}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.sectionTitle}>Sin movimientos</Text>
          <Text style={styles.softText}>
            Registra ingresos, gastos o transferencias para ver actividad aquí.
          </Text>
        </View>
      }
      ListHeaderComponent={
        <FilterList
          onChange={onFilterChange}
          options={[
            { label: 'Todos', value: 'all' },
            { label: 'Ingresos', value: 'income' },
            { label: 'Gastos', value: 'expense' },
            { label: 'Transferencias', value: 'transfer' },
          ]}
          value={filter}
        />
      }
      renderItem={({ item: entry }) => {
        const kind = entryKind(entry.type)
        const entryWallet = wallets.find((item) => item.id === entry.walletId) ?? null
        const transferContext =
          kind === 'transfer'
            ? resolveTransferContext(entry, exchanges, wallets)
            : null

        const meta =
          kind === 'income'
            ? (incomeSources.find((item) => item.id === entry.incomeSourceId)?.name ??
              'Ingreso')
            : kind === 'transfer'
              ? transferContext
                ? `${transferContext.sourceWallet?.name ?? 'Origen'} -> ${
                    transferContext.destinationWallet?.name ?? 'Destino'
                  } • +${transferContext.exchange.toAmount.toFixed(2)} ${
                    transferContext.destinationWallet?.currency ?? ''
                  } • ${formatEntryTime(entry.date)}`
                : `Transferencia • ${formatEntryTime(entry.date)}`
              : `${
                  categories.find((item) => item.id === entry.categoryId)?.name ?? 'Gasto'
                } • ${formatEntryTime(entry.date)}`

        const title =
          kind === 'transfer'
            ? entry.description ??
              `Transferencia a ${
                transferContext?.destinationWallet?.name ?? 'otra billetera'
              }`
            : entry.description ?? 'Sin descripción'

        const amountText =
          kind === 'income'
            ? `+${Math.abs(entry.amount).toFixed(2)} ${entryWallet?.currency ?? ''}`.trim()
            : kind === 'transfer'
              ? `-${(
                  transferContext?.exchange.fromAmount ?? Math.abs(entry.amount)
                ).toFixed(2)} ${transferContext?.sourceWallet?.currency ?? ''}`.trim()
              : `-${Math.abs(entry.amount).toFixed(2)} ${entryWallet?.currency ?? ''}`.trim()

        return (
          <View style={styles.listCard}>
            <View
              style={[
                styles.accent,
                kind === 'income'
                  ? styles.accentGreen
                  : kind === 'transfer'
                    ? styles.accentGray
                    : styles.accentRed,
              ]}
            />
            <View style={styles.listBody}>
              <View style={styles.rowBetween}>
                <Text style={styles.listTitle}>{title}</Text>
                <Text
                  style={[
                    styles.listAmount,
                    kind === 'income'
                      ? styles.income
                      : kind === 'transfer'
                        ? styles.transfer
                        : styles.expense,
                  ]}
                >
                  {amountText}
                </Text>
              </View>
              <Text style={styles.listMeta}>{meta}</Text>
            </View>
          </View>
        )
      }}
      renderSectionHeader={({ section }) => (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{groupLabel(section.title)}</Text>
        </View>
      )}
      sections={sections}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
    />
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  group: {
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  groupLabel: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: 0,
  },
  accent: {
    width: 4,
    borderRadius: theme.radii.pill,
    alignSelf: 'stretch',
  },
  accentGreen: { backgroundColor: theme.colors.green },
  accentGray: { backgroundColor: theme.colors.grayLight },
  accentRed: { backgroundColor: theme.colors.red },
  listBody: { flex: 1, gap: 6 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listTitle: {
    flex: 1,
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  listAmount: { fontSize: 14, fontWeight: '800' },
  income: { color: theme.colors.green },
  transfer: { color: theme.colors.primary },
  expense: { color: theme.colors.red },
  listMeta: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  emptyCard: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: 8,
  },
  sectionTitle: { color: theme.colors.white, fontSize: 16, fontWeight: '800' },
  softText: { color: theme.colors.grayLight, fontSize: 13, lineHeight: 20 },
})
