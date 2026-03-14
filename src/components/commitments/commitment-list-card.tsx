import { StyleSheet, Text, View } from "react-native";

import type { CommitmentOverview } from "@/modules/commitments/calculations";
import type { Wallet } from "@/modules/wallets/types";

type CommitmentListCardProps = {
  activeWallet: Wallet | null;
  overview: CommitmentOverview | null;
};

function formatMoney(currency: string | null, value: number) {
  if (!currency) {
    return "--";
  }

  return `${currency} ${value.toFixed(2)}`;
}

export function CommitmentListCard({
  activeWallet,
  overview,
}: CommitmentListCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Mapa del periodo</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compromisos fijos</Text>
        {overview?.recurringExpenses.length ? (
          overview.recurringExpenses.map((item) => (
            <View key={item.expense.id} style={styles.row}>
              <View style={styles.textGroup}>
                <Text style={styles.primaryText}>{item.expense.name}</Text>
                <Text style={styles.secondaryText}>
                  {item.expense.frequency} | pagado{" "}
                  {formatMoney(activeWallet?.currency ?? null, item.paidAmount)}
                </Text>
              </View>
              <Text style={styles.amountText}>
                {formatMoney(activeWallet?.currency ?? null, item.remainingAmount)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay compromisos fijos en esta wallet.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eventos presupuestados</Text>
        {overview?.provisions.length ? (
          overview.provisions.map((item) => (
            <View key={item.provision.id} style={styles.row}>
              <View style={styles.textGroup}>
                <Text style={styles.primaryText}>{item.provision.name}</Text>
                <Text style={styles.secondaryText}>
                  {item.provision.recurrence} | pagado{" "}
                  {formatMoney(activeWallet?.currency ?? null, item.paidAmount)}
                </Text>
              </View>
              <Text style={styles.amountText}>
                {formatMoney(activeWallet?.currency ?? null, item.remainingAmount)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay eventos presupuestados activos.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#0C1324",
    gap: 16,
    padding: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "800",
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
  amountText: {
    color: "#FDE68A",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
});
