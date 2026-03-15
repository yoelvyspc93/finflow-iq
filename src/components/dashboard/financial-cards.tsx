import { StyleSheet, Text, View } from "react-native";

type FinancialCardsProps = {
  assignableAmount: number;
  committedAmount: number;
  currency: string | null;
  freeAmount: number;
  isLoading: boolean;
  reserveAmount: number;
};

function formatMoney(currency: string | null, value: number) {
  if (!currency) {
    return "--";
  }

  return `${currency} ${value.toFixed(2)}`;
}

export function FinancialCards({
  assignableAmount,
  committedAmount,
  currency,
  freeAmount,
  isLoading,
  reserveAmount,
}: FinancialCardsProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.eyebrow}>Radar financiero</Text>
          <Text style={styles.title}>Lo que ya esta comprometido</Text>
        </View>
        {isLoading ? (
          <Text style={styles.loadingText}>Sincronizando...</Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        <View style={[styles.metricCard, styles.metricCardWarning]}>
          <Text style={styles.metricLabel}>Comprometido</Text>
          <Text style={styles.metricValue}>
            {formatMoney(currency, committedAmount)}
          </Text>
          <Text style={styles.metricHint}>
            Obligaciones vigentes del periodo actual.
          </Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardCalm]}>
          <Text style={styles.metricLabel}>Libre</Text>
          <Text style={styles.metricValue}>{formatMoney(currency, freeAmount)}</Text>
          <Text style={styles.metricHint}>
            Disponible menos compromisos del mes.
          </Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardAccent]}>
          <Text style={styles.metricLabel}>Asignable</Text>
          <Text style={styles.metricValue}>
            {formatMoney(currency, assignableAmount)}
          </Text>
          <Text style={styles.metricHint}>
            Libre despues de la reserva sugerida.
          </Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardNeutral]}>
          <Text style={styles.metricLabel}>Reserva sugerida</Text>
          <Text style={styles.metricValue}>
            {formatMoney(currency, reserveAmount)}
          </Text>
          <Text style={styles.metricHint}>
            Colchon basado en salario pendiente y ahorro objetivo.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: "#0C1324",
    gap: 16,
    overflow: "hidden",
    padding: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTextGroup: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: "#9FB0FF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
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
    minWidth: 160,
    flexGrow: 1,
    flexBasis: 160,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  metricCardWarning: {
    borderColor: "rgba(251, 191, 36, 0.24)",
    backgroundColor: "rgba(146, 64, 14, 0.16)",
  },
  metricCardCalm: {
    borderColor: "rgba(125, 211, 252, 0.22)",
    backgroundColor: "rgba(14, 116, 144, 0.12)",
  },
  metricCardAccent: {
    borderColor: "rgba(217, 249, 157, 0.28)",
    backgroundColor: "rgba(101, 163, 13, 0.12)",
  },
  metricCardNeutral: {
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "#11182D",
  },
  metricLabel: {
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
  },
  metricHint: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
  },
});
