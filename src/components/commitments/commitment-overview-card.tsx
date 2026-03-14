import { StyleSheet, Text, View } from "react-native";

import type { CommitmentOverview } from "@/modules/commitments/calculations";
import type { Wallet } from "@/modules/wallets/types";

type CommitmentOverviewCardProps = {
  activeWallet: Wallet | null;
  isLoading: boolean;
  overview: CommitmentOverview | null;
};

function formatMoney(currency: string | null, value: number) {
  if (!currency) {
    return "--";
  }

  return `${currency} ${value.toFixed(2)}`;
}

export function CommitmentOverviewCard({
  activeWallet,
  isLoading,
  overview,
}: CommitmentOverviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.eyebrow}>Mes activo</Text>
          <Text style={styles.title}>
            {overview?.activeMonth ?? new Date().toISOString().slice(0, 7)}
          </Text>
        </View>
        {isLoading ? (
          <Text style={styles.loadingText}>Actualizando...</Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        <View style={[styles.metricCard, styles.metricCardAccent]}>
          <Text style={styles.metricLabel}>Comprometido</Text>
          <Text style={styles.metricValue}>
            {formatMoney(activeWallet?.currency ?? null, overview?.totalCommitted ?? 0)}
          </Text>
          <Text style={styles.metricHint}>Todo lo que ya esta reservado.</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardNeutral]}>
          <Text style={styles.metricLabel}>Pagado</Text>
          <Text style={styles.metricValue}>
            {formatMoney(activeWallet?.currency ?? null, overview?.totalPaid ?? 0)}
          </Text>
          <Text style={styles.metricHint}>
            Pagos reales trazados contra estos compromisos.
          </Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardCalm]}>
          <Text style={styles.metricLabel}>Pendiente</Text>
          <Text style={styles.metricValue}>
            {formatMoney(activeWallet?.currency ?? null, overview?.totalRemaining ?? 0)}
          </Text>
          <Text style={styles.metricHint}>
            Lo que todavia falta cubrir este periodo.
          </Text>
        </View>
      </View>

      <View style={styles.breakdownRow}>
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownLabel}>Fijos y suscripciones</Text>
          <Text style={styles.breakdownValue}>
            {formatMoney(
              activeWallet?.currency ?? null,
              overview?.recurringRemaining ?? 0,
            )}
          </Text>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownLabel}>Eventos presupuestados</Text>
          <Text style={styles.breakdownValue}>
            {formatMoney(
              activeWallet?.currency ?? null,
              overview?.budgetProvisionRemaining ?? 0,
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: "#0C1324",
    gap: 16,
    padding: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTextGroup: {
    gap: 6,
  },
  eyebrow: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  metricCardAccent: {
    borderColor: "rgba(253, 230, 138, 0.26)",
    backgroundColor: "rgba(180, 83, 9, 0.14)",
  },
  metricCardNeutral: {
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "#11182D",
  },
  metricCardCalm: {
    borderColor: "rgba(134, 239, 172, 0.24)",
    backgroundColor: "rgba(22, 101, 52, 0.12)",
  },
  metricLabel: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  metricHint: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  breakdownRow: {
    flexDirection: "row",
    gap: 12,
  },
  breakdownCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#121B31",
    gap: 4,
    padding: 14,
  },
  breakdownLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  breakdownValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
});
