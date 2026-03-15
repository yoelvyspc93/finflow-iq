import { useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";

import { CommitmentWorkspace } from "@/components/commitments/commitment-workspace";
import { LedgerWorkspace } from "@/components/ledger/ledger-workspace";
import { SalaryWorkspace } from "@/components/salary/salary-workspace";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedControl } from "@/components/ui/segmented-control";

type FinanceView = "commitments" | "movements" | "salary";

export default function FinancesScreen() {
  const [view, setView] = useState<FinanceView>("movements");

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.border} />
        <ScreenHeader title="Finanzas" />
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            onChange={setView}
            options={[
              { label: "Movimientos", value: "movements" },
              { label: "Salario", value: "salary" },
              { label: "Compromisos", value: "commitments" },
            ]}
            value={view}
          />
        </View>

        {view === "movements" ? (
          <LedgerWorkspace
            accentColor="#D9F99D"
            description="Movimientos ya no es solo captura manual: desde aqui registras ingresos, gastos y transferencias entre wallets con trazabilidad doble en el ledger."
            eyebrow="Finanzas"
            hideHero
            showExchangeTools
            title="Operacion diaria y cambios internos"
          />
        ) : view === "salary" ? (
          <SalaryWorkspace
            accentColor="#7DD3FC"
            description="El modulo salarial ya permite crear periodos, registrar cobros y distribuirlos contra meses pendientes usando el backend que acabas de cerrar."
            eyebrow="Salario"
            hideHero
            title="Nomina y cobros reales"
          />
        ) : (
          <CommitmentWorkspace
            accentColor="#FDE68A"
            description="Los compromisos y eventos presupuestados ahora tienen alta propia, calculo mensual y pago real conectado al ledger para no duplicar dinero comprometido."
            eyebrow="Compromisos"
            hideHero
            title="Suscripciones, gastos fijos y eventos"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090D1A",
  },
  container: {
    flex: 1,
  },
  border: {
    position: "absolute",
    top: 61,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.09)",
  },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
