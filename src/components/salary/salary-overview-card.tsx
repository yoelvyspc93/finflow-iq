import { StyleSheet, Text, View } from "react-native";

import type { SalaryOverview } from "@/modules/salary/calculations";

type SalaryOverviewCardProps = {
  currency: string;
  overview: SalaryOverview | null;
};

export function SalaryOverviewCard({
  currency,
  overview,
}: SalaryOverviewCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resumen salarial</Text>

      <View style={styles.grid}>
        <View style={styles.panel}>
          <Text style={styles.label}>Pendiente</Text>
          <Text style={styles.value}>
            {overview ? `${currency} ${overview.pendingTotal.toFixed(2)}` : "--"}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Recibido</Text>
          <Text style={styles.value}>
            {overview ? `${currency} ${overview.totalReceived.toFixed(2)}` : "--"}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          Períodos cubiertos: {overview?.coveredPeriods ?? 0}
        </Text>
        <Text style={styles.metaText}>
          Meses sin cobrar: {overview?.monthsWithoutPayment ?? 0}
        </Text>
      </View>

      <Text style={styles.metaText}>
        Último cobro: {overview?.lastPaymentDate ?? "sin registros"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#0C1324",
    gap: 14,
    padding: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  panel: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#121B31",
    gap: 6,
    padding: 14,
  },
  label: {
    color: "#8DA1C4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  value: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },
});
