import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { CommitmentWorkspace } from "@/components/commitments/commitment-workspace";
import { LedgerWorkspace } from "@/components/ledger/ledger-workspace";
import { SalaryWorkspace } from "@/components/salary/salary-workspace";

type FinanceView = "commitments" | "movements" | "salary";

export default function FinancesScreen() {
  const [view, setView] = useState<FinanceView>("movements");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.segment}>
          <Pressable
            onPress={() => setView("movements")}
            style={[
              styles.segmentButton,
              view === "movements" && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentButtonText,
                view === "movements" && styles.segmentButtonTextActive,
              ]}
            >
              Movimientos
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setView("salary")}
            style={[
              styles.segmentButton,
              view === "salary" && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentButtonText,
                view === "salary" && styles.segmentButtonTextActive,
              ]}
            >
              Salario
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setView("commitments")}
            style={[
              styles.segmentButton,
              view === "commitments" && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentButtonText,
                view === "commitments" && styles.segmentButtonTextActive,
              ]}
            >
              Compromisos
            </Text>
          </Pressable>
        </View>

        {view === "movements" ? (
          <LedgerWorkspace
            accentColor="#D9F99D"
            description="Movimientos ya no es solo captura manual: desde aqui registras ingresos, gastos y transferencias entre wallets con trazabilidad doble en el ledger."
            eyebrow="Finanzas"
            showExchangeTools
            title="Operacion diaria y cambios internos"
          />
        ) : view === "salary" ? (
          <SalaryWorkspace
            accentColor="#7DD3FC"
            description="El modulo salarial ya permite crear periodos, registrar cobros y distribuirlos contra meses pendientes usando el backend que acabas de cerrar."
            eyebrow="Salario"
            title="Nomina y cobros reales"
          />
        ) : (
          <CommitmentWorkspace
            accentColor="#FDE68A"
            description="Los compromisos y eventos presupuestados ahora tienen alta propia, calculo mensual y pago real conectado al ledger para no duplicar dinero comprometido."
            eyebrow="Compromisos"
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
  segment: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 4,
  },
  segmentButton: {
    minWidth: 108,
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10192E",
  },
  segmentButtonActive: {
    backgroundColor: "#D9F99D",
  },
  segmentButtonText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "800",
  },
  segmentButtonTextActive: {
    color: "#08111F",
  },
});
