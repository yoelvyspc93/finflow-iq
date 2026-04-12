import { useEffect, useMemo } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DecorativeBackground } from '@/components/ui/decorative-background'
import { ScreenHeader } from '@/components/ui/screen-header'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { usePlanningStore } from '@/stores/planning-store'
import { theme } from '@/utils/theme'

export default function InsightsScreen() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const settings = useAppStore((state) => state.settings)
  const wallets = useAppStore((state) => state.wallets)
  const currentScore = usePlanningStore((state) => state.currentScore)
  const dashboardHealth = usePlanningStore((state) => state.dashboardHealth)
  const recentScores = usePlanningStore((state) => state.recentScores)
  const overview = usePlanningStore((state) => state.overview)
  const refreshPlanningData = usePlanningStore(
    (state) => state.refreshPlanningData,
  )

  useEffect(() => {
    if (!user?.id || !settings) {
      return
    }

    void refreshPlanningData({
      settings,
      userId: user.id,
      wallets,
    })
  }, [refreshPlanningData, settings, user?.id, wallets])

  const coverageDays =
    overview?.monthlyCommitmentAverage && overview.monthlyCommitmentAverage > 0
      ? Math.max(
          0,
          Math.round(
            (Math.max(
              (overview.availableBalance ?? 0) -
                (overview.committedAmount ?? 0),
              0,
            ) /
              overview.monthlyCommitmentAverage) *
              30,
          ),
        )
      : 0
  const displayedCoverageDays = coverageDays > 365 ? '365+' : String(coverageDays)

  const savingsRatio =
    overview?.monthlyIncome && overview.monthlyIncome > 0
      ? Math.round(
          (Math.max(overview.assignableAmount ?? 0, 0) / overview.monthlyIncome) *
            100,
        )
      : 0

  const scoreBars = useMemo(
    () =>
      recentScores.slice(0, 6).reverse().length
        ? recentScores
            .slice(0, 6)
            .reverse()
            .map((item) => ({
              id: item.weekStart,
              label: new Date(`${item.weekStart}T00:00:00.000Z`)
                .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                .toUpperCase(),
              value: item.score,
            }))
        : [
            {
              id: 'fallback-ene',
              label: 'ENE',
              value: currentScore?.breakdown.liquidity_score ?? 42,
            },
            {
              id: 'fallback-feb',
              label: 'FEB',
              value: currentScore?.breakdown.commitment_score ?? 56,
            },
            {
              id: 'fallback-mar',
              label: 'MAR',
              value: currentScore?.breakdown.savings_score ?? 48,
            },
            {
              id: 'fallback-abr',
              label: 'ABR',
              value: currentScore?.breakdown.salary_stability_score ?? 62,
            },
            {
              id: 'fallback-may',
              label: 'MAY',
              value: currentScore?.breakdown.wishlist_pressure_score ?? 58,
            },
            { id: 'fallback-jun', label: 'JUN', value: currentScore?.score ?? 64 },
          ],
    [currentScore, recentScores],
  )

  const aiSummary =
    dashboardHealth?.summary ??
    currentScore?.aiTip ??
    (savingsRatio > 0
      ? `Este mes tienes capacidad de ahorro equivalente a ${Math.min(savingsRatio, 100)}% de tus ingresos de referencia.`
      : 'Tu situación mantiene liquidez, pero aún depende de convertir dinero libre en ahorro.')

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: 'back', onPress: () => router.back() }}
        title="Análisis"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Puntaje semanal</Text>
          <Text style={styles.softText}>Actualizado hoy</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metric}>
            <Ionicons color="#6C83FF" name="water-outline" size={14} />
            <Text style={styles.metricValue}>
              {currentScore?.breakdown.liquidity_score ?? 0}
              <Text style={styles.metricScale}>/100</Text>
            </Text>
            <Text style={styles.metricLabel}>LIQUIDEZ</Text>
          </View>
          <View style={styles.metric}>
            <MaterialCommunityIcons
              color="#F59E0B"
              name="briefcase-clock-outline"
              size={14}
            />
            <Text style={styles.metricValue}>
              {Math.max(
                0,
                100 - (currentScore?.breakdown.commitment_score ?? 0),
              )}
              %
            </Text>
            <Text style={styles.metricLabel}>COMPROMISOS</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons
              color="#2AD596"
              name="shield-checkmark-outline"
              size={14}
            />
            <Text style={styles.metricValue}>
              {(currentScore?.breakdown.salary_stability_score ?? 0) >= 70
                ? 'Alta'
                : 'Media'}
            </Text>
            <Text style={styles.metricLabel}>ESTABILIDAD</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons color="#6C83FF" name="trending-up-outline" size={14} />
            <Text style={styles.metricValue}>{Math.max(savingsRatio, 0)}%</Text>
            <Text style={styles.metricLabel}>RATIO AHORRO</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.softText}>Cobertura estimada</Text>
          <Text style={styles.days}>{displayedCoverageDays} días</Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Evolución del puntaje</Text>
          <Text style={styles.softText}>Últimas 6 semanas</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.chart}>
            {scoreBars.map((bar) => (
              <View key={bar.id} style={styles.chartGroup}>
                <View style={styles.chartCols}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: Math.max(26, bar.value * 0.72) },
                    ]}
                  />
                  <View
                    style={[
                      styles.chartBar,
                      styles.chartBarMuted,
                      { height: Math.max(22, (bar.value - 10) * 0.7) },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumen automático</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{aiSummary}</Text>
          {dashboardHealth ? (
            <>
              <Text style={styles.bodyText}>Riesgo principal: {dashboardHealth.mainRisk}</Text>
              <Text style={styles.bodyText}>
                Oportunidad principal: {dashboardHealth.mainOpportunity}
              </Text>
              <Text style={styles.bodyText}>
                Acción inmediata: {dashboardHealth.immediateAction}
              </Text>
              <Text style={styles.bodyText}>
                Acción semanal: {dashboardHealth.weeklyAction}
              </Text>
            </>
          ) : null}
          <Text style={styles.bodyText}>
            Si mantienes este ritmo, podrías sostener tus compromisos por al menos{' '}
            {Math.max(Math.min(coverageDays, 365), 30)} días.
          </Text>
        </View>

        {dashboardHealth?.alerts?.length ? (
          <>
            <Text style={styles.sectionTitle}>Alertas inteligentes</Text>
            <View style={styles.card}>
              {dashboardHealth.alerts.map((alert) => (
                <View key={alert.id} style={styles.alertRow}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.bodyText}>{alert.body}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Pressable
          onPress={() => router.push('/(tabs)/planning')}
          style={({ pressed }) => [
            styles.backPlanning,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backPlanningText}>Volver a Planificación</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionTitle: { color: theme.colors.white, fontSize: 14, fontWeight: '800' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  softText: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
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
  metricValue: { color: '#F8FAFC', fontSize: 28, fontWeight: '700' },
  metricScale: { color: '#94A1BE', fontSize: 11, fontWeight: '700' },
  metricLabel: { color: '#8A96B3', fontSize: 11, fontWeight: '700' },
  card: {
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 8,
  },
  bodyText: { color: theme.colors.grayLight, fontSize: 13, lineHeight: 19 },
  alertRow: { gap: 4, marginBottom: 8 },
  alertTitle: { color: theme.colors.white, fontSize: 13, fontWeight: '700' },
  days: { color: theme.colors.white, fontSize: 36, fontWeight: '700' },
  chart: {
    minHeight: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
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
  backPlanning: {
    minHeight: 48,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    marginTop: 6,
  },
  backPlanningText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.88 },
})
