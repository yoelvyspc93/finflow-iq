import { StyleSheet, Text, View } from "react-native";

import type { LedgerEntry } from "@/modules/ledger/types";

type MovementHistoryCardProps = {
  entries: LedgerEntry[];
  isLoading: boolean;
};

export function MovementHistoryCard({
  entries,
  isLoading,
}: MovementHistoryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Historial reciente</Text>

      {isLoading ? (
        <Text style={styles.helperText}>Actualizando movimientos...</Text>
      ) : null}

      {entries.length ? (
        entries.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.textGroup}>
              <Text style={styles.primaryText}>
                {entry.description ?? entry.type}
              </Text>
              <Text style={styles.secondaryText}>
                {entry.date} | {entry.type}
              </Text>
            </View>

            <Text
              style={[
                styles.amount,
                entry.amount >= 0 ? styles.amountPositive : styles.amountNegative,
              ]}
            >
              {entry.amount >= 0 ? "+" : ""}
              {entry.amount.toFixed(2)}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Sin movimientos todavia</Text>
          <Text style={styles.emptyText}>
            El primer ingreso o gasto aparecera aqui en cuanto lo registres.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#0C1324",
    gap: 12,
    padding: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#121B31",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textGroup: {
    flex: 1,
    gap: 4,
  },
  primaryText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
  },
  amountPositive: {
    color: "#34D399",
  },
  amountNegative: {
    color: "#F87171",
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    backgroundColor: "#11182D",
    gap: 8,
    padding: 16,
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
});
