import { StyleSheet, Text, View } from "react-native";

import type { SalaryPayment } from "@/modules/salary/types";

type SalaryPaymentListCardProps = {
  currency: string;
  payments: SalaryPayment[];
};

export function SalaryPaymentListCard({
  currency,
  payments,
}: SalaryPaymentListCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cobros registrados</Text>
      {payments.length ? (
        payments.map((payment) => (
          <View key={payment.id} style={styles.row}>
            <View style={styles.textGroup}>
              <Text style={styles.primary}>
                {payment.description ?? "Cobro salarial"}
              </Text>
              <Text style={styles.secondary}>
                {payment.paymentDate} | asignado {payment.allocatedAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.amountBlock}>
              <Text style={styles.amount}>
                +{currency} {payment.grossAmount.toFixed(2)}
              </Text>
              <Text style={styles.status}>{payment.status}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>
          Todavia no hay cobros salariales registrados.
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
  amountBlock: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    color: "#34D399",
    fontSize: 14,
    fontWeight: "800",
  },
  status: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
});
