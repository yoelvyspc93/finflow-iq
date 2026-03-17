import { useEffect, useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { usePlanningStore } from "@/stores/planning-store";

export default function InsightsScreen() {
  const router = useRouter();
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const currentScore = usePlanningStore((state) => state.currentScore);
  const recentScores = usePlanningStore((state) => state.recentScores);
  const overview = usePlanningStore((state) => state.overview);
  const refreshPlanningData = usePlanningStore((state) => state.refreshPlanningData);

  useEffect(() => {
    if (!user?.id || !settings) {
      return;
    }

    void refreshPlanningData({ isDevBypass, settings, userId: user.id, wallets });
  }, [isDevBypass, refreshPlanningData, settings, user?.id, wallets]);

  const coverageDays =
    overview?.monthlyCommitmentAverage && overview.monthlyCommitmentAverage > 0
      ? Math.max(
          0,
          Math.round(
            (Math.max((overview.availableBalance ?? 0) - (overview.committedAmount ?? 0), 0) /
              overview.monthlyCommitmentAverage) *
              30,
          ),
        )
      : 0;

  const savingsRatio =
    overview?.monthlyIncome && overview.monthlyIncome > 0
      ? Math.round(
          ((overview.monthlyGoalContributionAverage ?? 0) / overview.monthlyIncome) * 100,
        )
      : 0;

  const scoreBars = useMemo(
    () =>
      recentScores.slice(0, 6).reverse().length
        ? recentScores.slice(0, 6).reverse().map((item) => ({
            label: new Date(`${item.weekStart}T00:00:00.000Z`)
              .toLocaleDateString("en-US", { month: "short" })
              .toUpperCase(),
            value: item.score,
          }))
        : [
            { label: "ENE", value: currentScore?.breakdown.liquidity_score ?? 42 },
            { label: "FEB", value: currentScore?.breakdown.commitment_score ?? 56 },
            { label: "MAR", value: currentScore?.breakdown.savings_score ?? 48 },
            { label: "ABR", value: currentScore?.breakdown.salary_stability_score ?? 62 },
            { label: "MAY", value: currentScore?.breakdown.wishlist_pressure_score ?? 58 },
            { label: "JUN", value: currentScore?.score ?? 64 },
          ],
    [currentScore, recentScores],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        title="Insights"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>AI Score Semanal</Text>
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
            <MaterialCommunityIcons color="#F59E0B" name="briefcase-clock-outline" size={14} />
            <Text style={styles.metricValue}>
              {Math.max(0, 100 - (currentScore?.breakdown.commitment_score ?? 0))}%
            </Text>
            <Text style={styles.metricLabel}>COMPROMISOS</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons color="#2AD596" name="shield-checkmark-outline" size={14} />
            <Text style={styles.metricValue}>
              {(currentScore?.breakdown.salary_stability_score ?? 0) >= 70 ? "Alta" : "Media"}
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
          <Text style={styles.softText}>Tu dinero dura</Text>
          <Text style={styles.days}>{coverageDays} dias</Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Ingresos vs Gastos</Text>
          <Text style={styles.softText}>Ultimos 6 meses</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.chart}>
            {scoreBars.map((bar) => (
              <View key={bar.label} style={styles.chartGroup}>
                <View style={styles.chartCols}>
                  <View style={[styles.chartBar, { height: Math.max(26, bar.value * 0.72) }]} />
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

        <Text style={styles.sectionTitle}>Reporte Narrativo IA</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            {savingsRatio > 0
              ? `Este mes lograste mejorar tu ahorro en ${Math.min(savingsRatio, 14)}%.`
              : "Tu estructura mantiene liquidez, pero aun depende de convertir dinero libre en ahorro."}
          </Text>
          <Text style={styles.bodyText}>
            Si mantienes este ritmo, alcanzaras estabilidad operativa en al menos {Math.max(coverageDays, 30)} dias.
          </Text>
        </View>

        <Pressable onPress={() => router.push("/(tabs)/planning")} style={({ pressed }) => [styles.backPlanning, pressed && styles.pressed]}>
          <Text style={styles.backPlanningText}>Volver a Planificacion</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1020" },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 104, gap: 14 },
  sectionTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  softText: { color: "#8A96B3", fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 148,
    borderRadius: 12,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  metricValue: { color: "#F8FAFC", fontSize: 28, fontWeight: "900" },
  metricScale: { color: "#94A1BE", fontSize: 11, fontWeight: "800" },
  metricLabel: { color: "#8A96B3", fontSize: 11, fontWeight: "800" },
  card: {
    borderRadius: 14,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  bodyText: { color: "#CBD4EA", fontSize: 13, lineHeight: 19 },
  days: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  chart: { minHeight: 160, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  chartGroup: { flex: 1, alignItems: "center", gap: 8 },
  chartCols: { minHeight: 126, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  chartBar: { width: 6, borderRadius: 999, backgroundColor: "#4B69FF" },
  chartBarMuted: { backgroundColor: "rgba(84, 102, 158, 0.62)" },
  chartLabel: { color: "#7C89A8", fontSize: 10, fontWeight: "700" },
  backPlanning: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(84, 101, 146, 0.25)",
    backgroundColor: "rgba(24, 30, 51, 0.96)",
    marginTop: 6,
  },
  backPlanningText: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.88 },
});
