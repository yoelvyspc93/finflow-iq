import { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAppStore } from "@/stores/app-store";

type PlanningView = "desires" | "insights";
type DesireFilter = "all" | "bought" | "pending";

const wishItems = [
  {
    confidence: "IA: High Confidence",
    dateLabel: "15 Aug",
    note: '"Price drop expected soon"',
    price: 350,
    progress: 0.74,
    status: "pending" as const,
    title: "Sony u H-1000XM5",
  },
  {
    confidence: "IA: Medium",
    dateLabel: "Dec 2024",
    note: "Requires 4 months of saving",
    price: 1600,
    progress: 0.38,
    status: "pending" as const,
    title: "Herman Miller Embody",
  },
  {
    confidence: "SUCCESS",
    dateLabel: "Budgeted in June",
    note: "Successfully budgeted in June",
    price: 1000,
    progress: 1,
    status: "bought" as const,
    title: "Kindle Paperwhite",
  },
];

const chartBars = [68, 84, 72, 58, 86, 92, 63, 69, 88];

export default function PlanningScreen() {
  const [view, setView] = useState<PlanningView>("desires");
  const [filter, setFilter] = useState<DesireFilter>("all");
  const settings = useAppStore((state) => state.settings);

  const filteredWishes = useMemo(() => {
    if (filter === "all") {
      return wishItems;
    }

    if (filter === "bought") {
      return wishItems.filter((item) => item.status === "bought");
    }

    return wishItems.filter((item) => item.status !== "bought");
  }, [filter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.border} />
      <ScreenHeader title="Planificación" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          onChange={setView}
          options={[
            { label: "Deseos", value: "desires" },
            { label: "Insights", value: "insights" },
          ]}
          value={view}
        />

        {view === "desires" ? (
          <>
            <SegmentedControl
              compact
              onChange={setFilter}
              options={[
                { label: "Todos", value: "all" },
                { label: "Pendientes", value: "pending" },
                { label: "Comprados", value: "bought" },
              ]}
              value={filter}
            />

            <Text style={styles.sectionTitle}>Prioridades</Text>

            {filteredWishes.map((item) => (
              <View
                key={item.title}
                style={[
                  styles.wishCard,
                  item.status === "bought" && styles.wishCardDimmed,
                ]}
              >
                <View style={styles.wishHeader}>
                  <Text style={styles.wishTitle}>{item.title}</Text>
                  <Text style={styles.wishPrice}>${item.price.toLocaleString()}</Text>
                </View>

                <Text
                  style={[
                    styles.wishConfidence,
                    item.status === "bought"
                      ? styles.wishConfidenceBought
                      : item.confidence.includes("High")
                        ? styles.wishConfidenceHigh
                        : styles.wishConfidenceMedium,
                  ]}
                >
                  {item.confidence}
                </Text>
                <Text style={styles.wishNote}>{item.note}</Text>

                <View style={styles.wishFooter}>
                  <Text style={styles.wishDate}>{item.dateLabel}</Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressValue, { width: `${item.progress * 100}%` }]}
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.tipCard}>
              <Text style={styles.tipEyebrow}>TIP DE IA</Text>
              <Text style={styles.tipText}>
                Si pospones el Sony WH-1000XM5 por 2 semanas, podrías alcanzar
                la meta del Herman Miller un mes antes.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Liquidez</Text>
                <Text style={styles.metricValue}>88</Text>
                <Text style={styles.metricScale}>/100</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Compromisos</Text>
                <Text style={styles.metricValue}>12%</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Estabilidad</Text>
                <Text style={styles.metricValue}>Alta</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Ratio ahorro</Text>
                <Text style={styles.metricValue}>32%</Text>
              </View>
            </View>

            <View style={styles.daysCard}>
              <Text style={styles.daysLabel}>Tu dinero dura</Text>
              <Text style={styles.daysValue}>42 días</Text>
              <Text style={styles.daysMeta}>
                Sin ingresos (Promedio) 3.2 meses de vida
              </Text>
              <View style={styles.daysTrack}>
                <View style={styles.daysTrackValue} />
              </View>
            </View>

            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Ingresos vs Gastos</Text>
              <Text style={styles.chartMeta}>Últimos 6 meses</Text>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartBars}>
                {chartBars.map((height, index) => (
                  <View key={`bar-${index}`} style={styles.chartBarGroup}>
                    <View style={[styles.chartBar, { height }]} />
                    <Text style={styles.chartMonth}>
                      {["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP"][index]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.reportCard}>
              <Text style={styles.sectionTitle}>Reporte Narrativo IA</Text>
              <Text style={styles.reportText}>
                Este mes has logrado reducir tus gastos hormiga en un{" "}
                <Text style={styles.reportAccent}>14%</Text>. Tus ingresos han
                sido estables, pero el ratio de ahorro ha crecido gracias a la
                optimización de suscripciones.
              </Text>
              <Text style={styles.reportText}>
                Si mantienes este ritmo, alcanzarás tu meta de Fondo de
                Emergencia en solo <Text style={styles.reportAccent}>4 meses</Text>,
                adelantándote 60 días a la proyección inicial.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipEyebrow}>TIP DE IA</Text>
              <Text style={styles.tipText}>
                Detectamos un excedente de $120 en tu cuenta corriente. Moverlo
                hoy a tu cuenta de ahorros de alto rendimiento podría generar un
                café extra al mes solo en intereses.
              </Text>
            </View>
          </>
        )}

        <Text style={styles.footerMeta}>
          Formato actual: {settings?.dateFormat ?? "DD/MM/YYYY"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1020",
  },
  border: {
    position: "absolute",
    top: 61,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.09)",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  wishCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 8,
  },
  wishCardDimmed: {
    opacity: 0.55,
  },
  wishHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wishTitle: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  wishPrice: {
    color: "#4562FF",
    fontSize: 18,
    fontWeight: "800",
  },
  wishConfidence: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
  },
  wishConfidenceHigh: {
    color: "#34D399",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  wishConfidenceMedium: {
    color: "#FBBF24",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
  wishConfidenceBought: {
    color: "#D1D5DB",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },
  wishNote: {
    color: "#C0CADF",
    fontSize: 14,
    lineHeight: 20,
  },
  wishFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wishDate: {
    color: "#94A3B8",
    fontSize: 12,
    minWidth: 64,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    overflow: "hidden",
  },
  progressValue: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#4562FF",
  },
  tipCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(69, 98, 255, 0.28)",
    backgroundColor: "rgba(24, 34, 63, 0.85)",
    padding: 16,
    gap: 8,
  },
  tipEyebrow: {
    color: "#4562FF",
    fontSize: 12,
    fontWeight: "800",
  },
  tipText: {
    color: "#D4DEEF",
    fontSize: 14,
    lineHeight: 21,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 6,
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  metricScale: {
    color: "#94A3B8",
    fontSize: 12,
  },
  daysCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 8,
  },
  daysLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  daysValue: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  daysMeta: {
    color: "#C0CADF",
    fontSize: 14,
    lineHeight: 20,
  },
  daysTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    overflow: "hidden",
  },
  daysTrackValue: {
    width: "78%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#34D399",
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chartMeta: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  chartCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 150,
  },
  chartBarGroup: {
    alignItems: "center",
    gap: 8,
  },
  chartBar: {
    width: 12,
    borderRadius: 999,
    backgroundColor: "#4562FF",
  },
  chartMonth: {
    color: "#77829B",
    fontSize: 10,
    fontWeight: "700",
  },
  reportCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 12,
  },
  reportText: {
    color: "#CDD7E8",
    fontSize: 14,
    lineHeight: 22,
  },
  reportAccent: {
    color: "#34D399",
    fontWeight: "800",
  },
  footerMeta: {
    color: "#77829B",
    fontSize: 12,
    textAlign: "center",
  },
});
