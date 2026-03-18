import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CommitmentSectionList } from '@/components/planning/commitment-section-list'
import { CommitmentSheet } from '@/components/planning/commitment-sheet'
import { PlanningSheetStack } from '@/components/planning/planning-sheet-stack'
import { WishProjectionList } from '@/components/planning/wish-projection-list'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { DecorativeBackground } from '@/components/ui/decorative-background'
import { ScreenHeader } from '@/components/ui/screen-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { usePlanningScreen } from '@/hooks/use-planning-screen'
import { theme } from '@/utils/theme'

export default function PlanningScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ view?: string | string[] }>()
  const {
    activeGoals,
    actionTip,
    budgetProvisions,
    closeSheet,
    commitmentDraft,
    commitmentError,
    commitmentOpen,
    contributionDraft,
    error,
    filter,
    filteredWishes,
    goalDraft,
    handleCreateCommitment,
    handleCreateContribution,
    handleCreateGoal,
    handleCreateWish,
    isCommitmentSubmitting,
    isLoading,
    isReady,
    isSubmitting,
    openCommitmentSheet,
    openContributionSheet,
    openGoalSheet,
    openWishSheet,
    pickerOpen,
    recurringExpenses,
    selectedWalletId,
    setCommitmentDraft,
    setCommitmentOpen,
    setContributionDraft,
    setFilter,
    setGoalDraft,
    setPickerOpen,
    setView,
    setWishDraft,
    sheet,
    sheetError,
    view,
    wallets,
    wishDraft,
  } = usePlanningScreen(params.view)

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        primaryAction={{ icon: 'plus', onPress: () => setPickerOpen(true) }}
        secondaryAction={{
          icon: 'bell',
          onPress: () => router.push('/notifications'),
          showBadge: true,
        }}
        title="Planificacion"
      />

      <View style={styles.contentPanel}>
        <View style={styles.contentHeader}>
          <SegmentedControl
            onChange={setView}
            options={[
              { label: 'Deseos', value: 'desires' },
              { label: 'Compromisos', value: 'commitments' },
            ]}
            value={view}
          />
        </View>

        {!isReady && isLoading ? (
          <View style={styles.cardCenter}>
            <ActivityIndicator color="#4664FF" />
            <Text style={styles.softText}>Calculando planificacion...</Text>
          </View>
        ) : error ? (
          <View style={styles.cardCenter}>
            <Text style={styles.cardTitle}>No se pudo cargar</Text>
            <Text style={styles.softText}>{error}</Text>
          </View>
        ) : view === 'desires' ? (
          <WishProjectionList
            actionTip={actionTip}
            filter={filter}
            items={filteredWishes}
            onFilterChange={(value) => setFilter(value as typeof filter)}
          />
        ) : (
          <CommitmentSectionList
            budgetProvisions={budgetProvisions}
            recurringExpenses={recurringExpenses}
            selectedWalletId={selectedWalletId}
          />
        )}
      </View>

      <BottomSheet onClose={() => setPickerOpen(false)} visible={pickerOpen}>
        <Text style={styles.sheetTitle}>Acciones de planificacion</Text>
        <Text style={styles.softText}>
          Todas las altas salen por BottomSheet para mantener el flujo limpio.
        </Text>
        <View style={styles.sheetGrid}>
          <Pressable
            onPress={openGoalSheet}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#2AD596" name="flag-outline" size={20} />
            <Text style={styles.sheetActionText}>Adicionar meta</Text>
          </Pressable>
          <Pressable
            disabled={activeGoals.length === 0}
            onPress={() => openContributionSheet()}
            style={({ pressed }) => [
              styles.sheetAction,
              activeGoals.length === 0 && styles.sheetActionDisabled,
              pressed && activeGoals.length > 0 && styles.pressed,
            ]}
          >
            <Ionicons color="#6C83FF" name="cash-outline" size={20} />
            <Text style={styles.sheetActionText}>Registrar aporte</Text>
          </Pressable>
          <Pressable
            onPress={openWishSheet}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#F59E0B" name="sparkles-outline" size={20} />
            <Text style={styles.sheetActionText}>Adicionar deseo</Text>
          </Pressable>
          <Pressable
            onPress={openCommitmentSheet}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#6C83FF" name="calendar-outline" size={20} />
            <Text style={styles.sheetActionText}>Adicionar compromiso</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <CommitmentSheet
        draft={commitmentDraft}
        error={commitmentError}
        isSubmitting={isCommitmentSubmitting}
        onClose={() => setCommitmentOpen(false)}
        onSubmit={() => void handleCreateCommitment()}
        setDraft={setCommitmentDraft}
        visible={commitmentOpen}
        wallets={wallets}
      />

      <PlanningSheetStack
        activeGoals={activeGoals}
        contributionDraft={contributionDraft}
        goalDraft={goalDraft}
        isSubmitting={isSubmitting}
        onClose={closeSheet}
        onSubmitContribution={() => void handleCreateContribution()}
        onSubmitGoal={() => void handleCreateGoal()}
        onSubmitWish={() => void handleCreateWish()}
        setContributionDraft={setContributionDraft}
        setGoalDraft={setGoalDraft}
        setWishDraft={setWishDraft}
        sheet={sheet}
        sheetError={sheetError}
        wallets={wallets}
        wishDraft={wishDraft}
      />
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  contentPanel: { flex: 1 },
  contentHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  sectionTitle: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  card: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  cardCenter: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardDim: { opacity: 0.52 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTitle: { color: theme.colors.white, fontSize: 15, fontWeight: '700', flex: 1 },
  strike: { textDecorationLine: 'line-through' },
  price: { color: theme.colors.primary, fontSize: 15, fontWeight: '700' },
  pill: { color: theme.colors.green, fontSize: 10, fontWeight: '700' },
  bodyText: { color: theme.colors.grayLight, fontSize: 13, lineHeight: 19 },
  softText: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  tipCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.blueSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blueSoft,
  },
  tipBody: { flex: 1, gap: 6 },
  tipTitle: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  label: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
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
  input: {
    minHeight: 42,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  errorText: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginTop: 10 },
  submitAction: {
    minHeight: 50,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginTop: 16,
  },
  submitActionDisabled: { opacity: 0.75 },
  submitActionText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  track: {
    width: 72,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.grayLight,
    overflow: 'hidden',
  },
  trackLong: {
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: 'rgba(92, 103, 135, 0.34)',
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary },
  trackFillGreen: {
    height: '100%',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.green,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 148,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 8,
  },
  metricValue: { color: theme.colors.white, fontSize: 28, fontWeight: '700' },
  metricScale: { color: theme.colors.grayLight, fontSize: 11, fontWeight: '700' },
  metricLabel: { color: theme.colors.grayLight, fontSize: 11, fontWeight: '700' },
  days: { color: theme.colors.white, fontSize: 36, fontWeight: '700' },
  hourglass: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blueSoft,
  },
  linkText: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  chart: {
    minHeight: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  chartGroup: { flex: 1, alignItems: 'center', gap: 8 },
  chartCols: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  chartBar: { width: 6, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary },
  chartBarMuted: { backgroundColor: theme.colors.grayLight },
  chartLabel: { color: theme.colors.grayLight, fontSize: 10, fontWeight: '700' },
  sheetTitle: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  sheetAction: {
    width: '48%',
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  sheetActionDisabled: { opacity: 0.45 },
  sheetActionText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: { opacity: 0.88 },
})




