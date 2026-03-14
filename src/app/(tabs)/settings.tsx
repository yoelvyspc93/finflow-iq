import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";

export default function SettingsScreen() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);

  async function handleSignOut() {
    if (isDevBypass) {
      clearAuth();
      return;
    }

    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Ajustes base</Text>
          <Text style={styles.title}>Configuracion inicial operativa</Text>
          <Text style={styles.description}>
            Esta pantalla ya refleja el estado real guardado en settings y
            wallets. Las ediciones completas llegan en una fase posterior.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Preferencias</Text>
            <Text style={styles.panelValue}>
              Formato: {settings?.dateFormat ?? "--"}
            </Text>
            <Text style={styles.panelMeta}>
              Ahorro sugerido: {settings?.savingsGoalPercent ?? "--"}%
            </Text>
            <Text style={styles.panelMeta}>
              Moneda principal: {settings?.primaryCurrency ?? "--"}
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Wallets</Text>
            <Text style={styles.panelValue}>{wallets.length}</Text>
            <Text style={styles.panelMeta}>
              Activa: {selectedWalletId ?? "ninguna"}
            </Text>
            <Text style={styles.panelMeta}>
              Resumen semanal: {settings?.weeklySummaryDay ?? "--"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            void handleSignOut();
          }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Cerrar sesion</Text>
        </Pressable>
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
    gap: 16,
    padding: 24,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(217, 249, 157, 0.18)",
    backgroundColor: "#121B31",
    gap: 10,
    padding: 22,
  },
  eyebrow: {
    color: "#D9F99D",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
  },
  description: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  panel: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: "#0D1427",
    gap: 8,
    padding: 18,
  },
  panelTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "800",
  },
  panelValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
  },
  panelMeta: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#24314E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
});
