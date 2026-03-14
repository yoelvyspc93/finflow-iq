import { SafeAreaView, StyleSheet } from "react-native";

import { LedgerWorkspace } from "@/components/ledger/ledger-workspace";

export default function FinancesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LedgerWorkspace
        accentColor="#D9F99D"
        description="Finanzas concentra la captura de movimientos base del producto. Desde aqui puedes registrar flujo de caja manual mientras las demas capas del dominio siguen entrando por fases."
        eyebrow="Finanzas"
        title="Captura manual sobre el ledger"
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
