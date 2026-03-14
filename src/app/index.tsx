import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { Redirect } from "expo-router";

import { supabase } from "@/lib/supabase/client";
import {
  selectActiveWallet,
  selectActiveWalletBalance,
  selectRecentLedgerEntries,
} from "@/modules/ledger/selectors";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useLedgerStore } from "@/stores/ledger-store";
import { useSecurityStore } from "@/stores/security-store";

export default function Index() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const isReady = useAuthStore((state) => state.isReady);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const appError = useAppStore((state) => state.error);
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const isAppLoading = useAppStore((state) => state.isLoading);
  const isAppReady = useAppStore((state) => state.isReady);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const entries = useLedgerStore((state) => state.entries);
  const isLedgerLoading = useLedgerStore((state) => state.isLoading);
  const ledgerError = useLedgerStore((state) => state.error);
  const isSecurityLoaded = useSecurityStore((state) => state.isLoaded);
  const pinStatus = useSecurityStore((state) => state.pinStatus);

  if (!isReady || status === "idle" || status === "loading") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Restaurando sesion...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status !== "authenticated") {
    return <Redirect href="/login" />;
  }

  if (!isSecurityLoaded || pinStatus === "unknown") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Preparando seguridad local...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (pinStatus !== "unlocked") {
    return <Redirect href="/pin" />;
  }

  const activeWallet = selectActiveWallet(wallets, selectedWalletId);
  const activeBalance = selectActiveWalletBalance(wallets, selectedWalletId);
  const recentEntries = selectRecentLedgerEntries(entries, 5);

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
        <View style={styles.card}>
          <Text style={styles.title}>Ledger base listo</Text>
          <Text style={styles.subtitle}>
            Balance cacheado en wallets y feed de movimientos ya conectados.
          </Text>

          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Wallet activa</Text>
            <Text style={styles.heroTitle}>
              {activeWallet?.name ?? "Sin wallet seleccionada"}
            </Text>
            <Text style={styles.heroAmount}>
              {activeWallet
                ? `${activeWallet.currency} ${activeBalance.toFixed(2)}`
                : "--"}
            </Text>
            <Text style={styles.heroMeta}>
              Onboarding completo: {hasCompletedOnboarding ? "si" : "no"}
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>App</Text>
              <Text style={styles.infoValue}>
                {isAppLoading ? "Cargando" : isAppReady ? "Lista" : "Pendiente"}
              </Text>
              <Text style={styles.infoMeta}>Wallets: {wallets.length}</Text>
              <Text style={styles.infoMeta}>
                Meta de ahorro: {settings?.savingsGoalPercent ?? "--"}%
              </Text>
            </View>

            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>Ledger</Text>
              <Text style={styles.infoValue}>
                {isLedgerLoading ? "Cargando" : `${entries.length} items`}
              </Text>
              <Text style={styles.infoMeta}>
                Wallet activa: {selectedWalletId ?? "ninguna"}
              </Text>
              <Text style={styles.infoMeta}>
                Usuario: {user?.email ?? "Sin email"}
              </Text>
            </View>
          </View>

          {isDevBypass ? (
            <Text style={styles.devHint}>
              Sesion simulada solo para desarrollo
            </Text>
          ) : null}

          {appError ? <Text style={styles.errorText}>{appError}</Text> : null}
          {ledgerError ? <Text style={styles.errorText}>{ledgerError}</Text> : null}

          <View style={styles.feedCard}>
            <Text style={styles.feedTitle}>Movimientos recientes</Text>
            {recentEntries.length ? (
              recentEntries.map((entry) => (
                <View key={entry.id} style={styles.feedRow}>
                  <View style={styles.feedTextBlock}>
                    <Text style={styles.feedPrimary}>
                      {entry.description ?? entry.type}
                    </Text>
                    <Text style={styles.feedSecondary}>
                      {entry.date} | {entry.type}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.feedAmount,
                      entry.amount > 0
                        ? styles.feedAmountPositive
                        : styles.feedAmountNegative,
                    ]}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount.toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyTitle}>Sin movimientos todavia</Text>
                <Text style={styles.emptyText}>
                  La siguiente UI anadira registro de ingresos y gastos sobre este
                  ledger.
                </Text>
              </View>
            )}
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    backgroundColor: "#11182D",
    padding: 24,
    gap: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    borderRadius: 22,
    backgroundColor: "#16203A",
    padding: 18,
    gap: 6,
  },
  heroLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "800",
  },
  heroAmount: {
    color: "#7C8CFF",
    fontSize: 30,
    fontWeight: "900",
  },
  heroMeta: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoPanel: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#0B1222",
    padding: 16,
    gap: 6,
  },
  infoTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  infoValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  infoMeta: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },
  devHint: {
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: "600",
  },
  feedCard: {
    borderRadius: 18,
    backgroundColor: "#0B1222",
    padding: 16,
    gap: 12,
  },
  feedTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "800",
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "#10192E",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedTextBlock: {
    flex: 1,
    gap: 4,
  },
  feedPrimary: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  feedSecondary: {
    color: "#94A3B8",
    fontSize: 12,
  },
  feedAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
  feedAmountPositive: {
    color: "#34D399",
  },
  feedAmountNegative: {
    color: "#F87171",
  },
  emptyBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
  loadingText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#24314E",
    alignItems: "center",
    justifyContent: "center",
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
