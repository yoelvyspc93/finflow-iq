import { SafeAreaView, StyleSheet } from "react-native";

import { LedgerWorkspace } from "@/components/ledger/ledger-workspace";

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LedgerWorkspace
        accentColor="#9FB0FF"
        description="El panel principal ya muestra disponible, comprometido, libre y asignable, sin perder el acceso rapido a ingresos, gastos y el historial reciente de la wallet activa."
        eyebrow="Panel"
        showFinancialCards
        title="Radar operativo del bolsillo activo"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090D1A",
  },
});
