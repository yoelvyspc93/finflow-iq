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
    actionTip,
    budgetProvisions,
    closeSheet,
    commitmentDraft,
    commitmentError,
    commitmentOpen,
    error,
    filter,
    filteredWishes,
    handleCreateCommitment,
    handleCreateWish,
    isCommitmentSubmitting,
    isLoading,
    isReady,
    isSubmitting,
    openCommitmentSheet,
    openWishSheet,
    pickerOpen,
    recurringExpenses,
    selectedWalletId,
    setCommitmentDraft,
    setCommitmentOpen,
    setFilter,
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
        title="Planificación"
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
            <Text style={styles.softText}>Preparando tu planificación...</Text>
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
        <Text style={styles.sheetTitle}>Organiza tu planificación</Text>
        <Text style={styles.softText}>
          Elige qué quieres registrar para ordenar mejor tus próximas compras y pagos.
        </Text>
        <View style={styles.sheetGrid}>
          <Pressable
            onPress={openWishSheet}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#F59E0B" name="sparkles-outline" size={20} />
            <Text style={styles.sheetActionText}>Agregar deseo</Text>
          </Pressable>
          <Pressable
            onPress={openCommitmentSheet}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#6C83FF" name="calendar-outline" size={20} />
            <Text style={styles.sheetActionText}>Agregar compromiso</Text>
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
        isSubmitting={isSubmitting}
        onClose={closeSheet}
        onSubmitWish={() => void handleCreateWish()}
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
  cardCenter: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardTitle: { color: theme.colors.white, fontSize: 15, fontWeight: '700', flex: 1 },
  softText: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
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
  sheetActionText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: { opacity: 0.88 },
})
