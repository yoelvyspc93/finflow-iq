import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Feather, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FinancesFormSheet } from '@/components/finances/finances-form-sheet'
import { MovementSectionList } from '@/components/finances/movement-section-list'
import { SalaryHistoryList } from '@/components/finances/salary-history-list'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { DecorativeBackground } from '@/components/ui/decorative-background'
import { ScreenHeader } from '@/components/ui/screen-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useFinancesScreen } from '@/hooks/use-finances-screen'
import { theme } from '@/utils/theme'

export default function FinancesScreen() {
  const router = useRouter()
  const {
    activeFormSheet,
    activeCategories,
    activeIncomeSources,
    activeWallet,
    categories,
    closeFormSheet,
    closeQuickSheet,
    draft,
    error,
    exchanges,
    filter,
    formTitle,
    incomeSources,
    isSubmitting,
    ledgerEntries,
    pendingMonths,
    pendingSalary,
    quickItems,
    selectedWalletId,
    setDraft,
    setFilter,
    setSheet,
    setView,
    sheet,
    submitLabel,
    submitSheet,
    view,
    visiblePeriods,
    wallets,
  } = useFinancesScreen()

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        primaryAction={{ icon: 'plus', onPress: () => setSheet('quick') }}
        secondaryAction={{
          icon: 'bell',
          onPress: () => router.push('/notifications'),
          showBadge: true,
        }}
        title="Finanzas"
      />

      <View style={styles.contentPanel}>
        <View style={styles.contentHeader}>
          <SegmentedControl
            onChange={setView}
            options={[
              { label: 'Movimientos', value: 'movements' },
              { label: 'Salario', value: 'salary' },
            ]}
            value={view}
          />
        </View>

        {view === 'movements' ? (
          <MovementSectionList
            categories={categories}
            entries={ledgerEntries}
            exchanges={exchanges}
            filter={filter}
            incomeSources={incomeSources}
            onFilterChange={(value) => setFilter(value as typeof filter)}
            wallets={wallets}
          />
        ) : (
          <SalaryHistoryList
            pendingMonths={pendingMonths}
            pendingSalary={pendingSalary}
            periods={visiblePeriods}
          />
        )}
      </View>

      <BottomSheet onClose={closeQuickSheet} visible={sheet === 'quick'}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Acciones rápidas</Text>
          <Pressable onPress={closeQuickSheet}>
            <Feather color="#8A96B3" name="x" size={20} />
          </Pressable>
        </View>
        <View style={styles.quickGrid}>
          {quickItems.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.quickTile,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.quickIcon,
                  item.tone === 'red'
                    ? styles.quickRed
                    : item.tone === 'green'
                      ? styles.quickGreen
                      : item.tone === 'orange'
                        ? styles.quickOrange
                        : styles.quickBlue,
                ]}
              >
                {item.icon === 'wallet-outline' ||
                item.icon === 'calendar-outline' ? (
                  <Ionicons
                    color="#4B69FF"
                    name={item.icon}
                    size={22}
                  />
                ) : (
                  <Feather
                    color={
                      item.icon === 'arrow-up-right'
                        ? '#FF6B6D'
                        : item.icon === 'arrow-down-left'
                          ? '#20D396'
                          : '#F59E0B'
                    }
                    name={item.icon}
                    size={22}
                  />
                )}
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <FinancesFormSheet
        activeWalletCurrency={activeWallet?.currency}
        activeWalletName={activeWallet?.name}
        categories={activeCategories}
        draft={draft}
        error={error}
        incomeSources={activeIncomeSources}
        isSubmitting={isSubmitting}
        onClose={closeFormSheet}
        onSubmit={() => void submitSheet()}
        selectedWalletId={selectedWalletId}
        setDraft={setDraft}
        sheet={activeFormSheet}
        submitLabel={submitLabel}
        title={formTitle}
        wallets={wallets}
      />
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentPanel: {
    flex: 1,
  },
  contentHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  group: { gap: 10 },
  groupLabel: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  listCard: {
    flexDirection: 'row',
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  accentGreen: { backgroundColor: theme.colors.green },
  accentGray: { backgroundColor: theme.colors.grayLight },
  accentRed: { backgroundColor: theme.colors.red },
  listBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  listTitle: { flex: 1, color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  listAmount: { fontSize: 15, fontWeight: '700' },
  income: { color: theme.colors.green },
  transfer: { color: theme.colors.grayLight },
  expense: { color: theme.colors.red },
  listMeta: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  statLabel: { color: theme.colors.grayLight, fontSize: 11, fontWeight: '700' },
  statValue: { color: theme.colors.white, fontSize: 22, fontWeight: '700' },
  statMeta: { color: theme.colors.red, fontSize: 11, fontWeight: '700' },
  salaryCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(49, 68, 138, 0.30)',
  },
  iconGreen: { backgroundColor: theme.colors.greenSoft },
  iconOrange: { backgroundColor: theme.colors.yellowSoft },
  iconRed: { backgroundColor: theme.colors.redSoft },
  cardFlex: { flex: 1, gap: 8 },
  pill: { color: theme.colors.grayLight, fontSize: 10, fontWeight: '700' },
  track: {
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: 'rgba(92, 103, 135, 0.34)',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: theme.colors.primary },
  commitmentCard: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 6,
  },
  commitmentAmount: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  commitmentStatus: { color: theme.colors.green, fontSize: 11, fontWeight: '700' },
  commitmentMuted: { color: theme.colors.grayLight },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.green,
  },
  dotBlue: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.grayLight },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: { color: theme.colors.white, fontSize: 24, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  quickTile: {
    width: '47%',
    borderRadius: theme.radii.sm,
    backgroundColor: 'rgba(24, 30, 51, 0.96)',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  quickIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRed: { backgroundColor: theme.colors.redSoft },
  quickGreen: { backgroundColor: theme.colors.greenSoft },
  quickOrange: { backgroundColor: theme.colors.yellowSoft },
  quickBlue: { backgroundColor: theme.colors.blueSoft },
  quickLabel: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    color: theme.colors.grayLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: 'rgba(39, 46, 82, 0.38)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  currency: { color: theme.colors.primary, fontSize: 28, fontWeight: '700' },
  amountInput: { flex: 1, color: theme.colors.white, fontSize: 28, fontWeight: '700' },
  cols: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  field: {
    minHeight: 42,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fieldText: { color: theme.colors.white, fontSize: 14, fontWeight: '600' },
  fieldInput: { color: theme.colors.white, fontSize: 14, paddingVertical: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    minWidth: 74,
    minHeight: 40,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.blueSoft,
  },
  chipText: { color: theme.colors.grayLight, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: theme.colors.white },
  area: {
    minHeight: 88,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    textAlignVertical: 'top',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  toggleText: { flex: 1, gap: 3 },
  toggleTitle: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  soft: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  error: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginTop: 12 },
  button: {
    minHeight: 52,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginTop: 18,
  },
  buttonText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.88 },
})




