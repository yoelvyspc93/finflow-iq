import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { LedgerWorkspace } from "@/components/ledger/ledger-workspace";
import { SalaryWorkspace } from "@/components/salary/salary-workspace";

type FinanceView = "movements" | "salary";

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
        </View>

        {view === "movements" ? (
          <LedgerWorkspace
            accentColor="#D9F99D"
            description="Finanzas concentra la captura de movimientos base del producto. Desde aqui puedes registrar flujo de caja manual mientras las demas capas del dominio siguen entrando por fases."
            eyebrow="Finanzas"
            title="Captura manual sobre el ledger"
          />
        ) : (
          <SalaryWorkspace
            accentColor="#7DD3FC"
            description="El modulo salarial ya permite crear periodos, registrar cobros y distribuirlos contra meses pendientes usando el backend que acabas de cerrar."
            eyebrow="Salario"
            title="Nomina y cobros reales"
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
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 4,
  },
  segmentButton: {
    flex: 1,
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
