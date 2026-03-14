import { StyleSheet, Text, View } from "react-native";

import { getSalaryPeriodPendingAmount } from "@/modules/salary/calculations";
import type { SalaryPeriod } from "@/modules/salary/types";

type SalaryPeriodListCardProps = {
  currency: string;
  periods: SalaryPeriod[];
};

export function SalaryPeriodListCard({
  currency,
  periods,
}: SalaryPeriodListCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Periodos</Text>
      {periods.length ? (
        periods.map((period) => (
          <View key={period.id} style={styles.row}>
            <View style={styles.textGroup}>
              <Text style={styles.primary}>{period.periodMonth}</Text>
              <Text style={styles.secondary}>
                Esperado {currency} {period.expectedAmount.toFixed(2)} | pendiente{" "}
                {getSalaryPeriodPendingAmount(period).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.status}>{period.status}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>
          No hay periodos de nomina para esta moneda todavia.
        </Text>
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
  primary: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  secondary: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  status: {
    color: "#D9F99D",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
});
