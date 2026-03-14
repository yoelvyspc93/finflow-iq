import { SafeAreaView, StyleSheet } from "react-native";

import { LedgerWorkspace } from "@/components/ledger/ledger-workspace";

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LedgerWorkspace
        accentColor="#9FB0FF"
        description="La vista principal ya puede registrar ingresos y gastos sobre el ledger, cambiar entre wallets activas y mostrar el historial reciente sin salir del panel."
        eyebrow="Panel"
        title="Operacion diaria lista para usar"
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
