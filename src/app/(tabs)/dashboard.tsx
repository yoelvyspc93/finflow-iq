import { useEffect, useMemo } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { selectActiveWallet } from "@/modules/ledger/selectors";
import { calculateSalaryOverview } from "@/modules/salary/calculations";
import {
  createMockSalaryPayments,
  createMockSalaryPeriods,
} from "@/modules/salary/types";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useCommitmentStore } from "@/stores/commitment-store";
import { useSalaryStore } from "@/stores/salary-store";

function formatMoney(currency: string | null, value: number) {
  if (!currency) {
    return "--";
  }

  return `${currency} ${value.toFixed(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function DashboardScreen() {
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const setSelectedWalletId = useAppStore((state) => state.setSelectedWalletId);
  const refreshCommitmentData = useCommitmentStore(
    (state) => state.refreshCommitmentData,
  );
  const commitmentOverview = useCommitmentStore((state) => state.overview);
  const refreshSalaryData = useSalaryStore((state) => state.refreshSalaryData);
  const salaryOverview = useSalaryStore((state) => state.overview);

  const activeWallet = selectActiveWallet(wallets, selectedWalletId);

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return;
    }

    void Promise.all([
      refreshCommitmentData({
        isDevBypass,
        month: currentMonth,
        userId: user.id,
        walletId: selectedWalletId,
      }),
      refreshSalaryData({
        isDevBypass,
        userId: user.id,
      }),
    ]);
  }, [
    currentMonth,
    isDevBypass,
    refreshCommitmentData,
    refreshSalaryData,
    selectedWalletId,
    user?.id,
  ]);

  const effectiveSalaryOverview = useMemo(() => {
    if (salaryOverview) {
      return salaryOverview;
    }

    if (!isDevBypass || !user?.id) {
      return null;
    }

    return calculateSalaryOverview(
      createMockSalaryPeriods(user.id),
      createMockSalaryPayments(user.id),
    );
  }, [isDevBypass, salaryOverview, user?.id]);

  const committedAmount = commitmentOverview?.totalRemaining ?? 0;
  const freeAmount = Math.max(0, (activeWallet?.balance ?? 0) - committedAmount);
  const reserveAmount =
    (commitmentOverview?.recurringCommitted ?? 0) *
    (effectiveSalaryOverview?.monthsWithoutPayment ?? 0) *
    (1 + (settings?.savingsGoalPercent ?? 0) / 100);
  const assignableAmount = freeAmount - reserveAmount;
  const liquidityRatio =
    activeWallet?.balance && activeWallet.balance > 0
      ? clamp(freeAmount / activeWallet.balance, 0, 1)
      : 0;
  const healthScore = Math.round(
    clamp(
      38 +
        liquidityRatio * 34 +
        Math.min(settings?.savingsGoalPercent ?? 0, 25) -
        (effectiveSalaryOverview?.monthsWithoutPayment ?? 0) * 3,
      0,
      100,
    ),
  );
  const budgetAlert = activeWallet?.balance
    ? Math.round(clamp((committedAmount / activeWallet.balance) * 100, 0, 100))
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.screenBorder} />
      <ScreenHeader showBrand title="FinFlow IQ" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Wallets</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walletsRow}
        >
          {wallets.map((wallet) => {
            const isActive = wallet.id === selectedWalletId;

            return (
              <Pressable
                key={wallet.id}
                onPress={() => setSelectedWalletId(wallet.id)}
                style={[
                  styles.walletCard,
                  isActive ? styles.walletCardActive : styles.walletCardMuted,
                ]}
              >
                <Text style={styles.walletName}>{wallet.name}</Text>
                <Text style={styles.walletAmount}>
                  {formatMoney(wallet.currency, wallet.balance)}
                </Text>
                <View style={styles.walletFooter}>
                  <Text style={styles.walletMeta}>
                    •••• {wallet.id.slice(0, 4).toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.walletDot,
                      isActive && styles.walletDotActive,
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Wallet Details</Text>
        </View>

        <View style={styles.metricStack}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricIconPositive]}>
              <Text style={styles.metricIconText}>⌂</Text>
            </View>
            <View style={styles.metricTextGroup}>
              <Text style={styles.metricLabel}>Available Balance</Text>
              <Text style={styles.metricValue}>
                {formatMoney(activeWallet?.currency ?? null, activeWallet?.balance ?? 0)}
              </Text>
            </View>
            <Text style={styles.metricChevron}>›</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricIconLocked]}>
              <Text style={styles.metricIconText}>◫</Text>
            </View>
            <View style={styles.metricTextGroup}>
              <Text style={styles.metricLabel}>Committed Funds</Text>
              <Text style={styles.metricValue}>
                {formatMoney(activeWallet?.currency ?? null, committedAmount)}
              </Text>
            </View>
            <Text style={styles.metricChevron}>›</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricIconAssign]}>
              <Text style={styles.metricIconText}>▣</Text>
            </View>
            <View style={styles.metricTextGroup}>
              <Text style={styles.metricLabel}>Assignable Amount</Text>
              <Text style={styles.metricValue}>
                {formatMoney(activeWallet?.currency ?? null, assignableAmount)}
              </Text>
            </View>
            <Text style={styles.metricChevron}>›</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Salary Outlook</Text>
          <Text style={styles.pendingBadge}>PENDING</Text>
        </View>

        <View style={styles.salaryCard}>
          <View style={styles.salaryColumn}>
            <Text style={styles.salaryLabel}>Remaining to receive</Text>
            <Text style={styles.salaryAmount}>
              {formatMoney(
                activeWallet?.currency ?? "USD",
                effectiveSalaryOverview?.pendingTotal ?? 0,
              )}
            </Text>
            <View style={styles.salaryProgressTrack}>
              <View
                style={[
                  styles.salaryProgressValue,
                  {
                    width: `${clamp(
                      ((effectiveSalaryOverview?.pendingTotal ?? 0) /
                        ((effectiveSalaryOverview?.pendingTotal ?? 0) + 1)) *
                        100,
                      12,
                      88,
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.salaryColumnCompact}>
            <Text style={styles.salaryLabel}>Months left</Text>
            <Text style={styles.salaryMonths}>
              {effectiveSalaryOverview?.monthsWithoutPayment ?? 0}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Health</Text>
        </View>

        <View style={styles.healthCard}>
          <View style={styles.ringOuter}>
            <View style={styles.ringArc} />
            <View style={styles.ringInner}>
              <Text style={styles.healthScore}>{healthScore}</Text>
              <Text style={styles.healthScale}>SCORE / 100</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipEyebrow}>AI TIP</Text>
          <Text style={styles.tipText}>
            Reduciendo tus dining expenses by 10% this month could boost your
            score by 4 points. Try our budget automation!
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Insights</Text>
        </View>

        <View style={styles.insightGrid}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Investment Growth</Text>
            <Text style={styles.insightValue}>+{liquidityRatio * 100 > 0 ? Math.round(liquidityRatio * 12.4) : 0}%</Text>
            <Text style={styles.insightMeta}>▲ $1,200 this month</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Budget Alert</Text>
            <Text style={styles.insightValue}>{budgetAlert}%</Text>
            <Text style={styles.insightMeta}>Entertainment limit</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1020",
  },
  screenBorder: {
    position: "absolute",
    top: 61,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.09)",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  walletsRow: {
    gap: 12,
    paddingRight: 8,
  },
  walletCard: {
    width: 188,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  walletCardActive: {
    backgroundColor: "#4562FF",
  },
  walletCardMuted: {
    backgroundColor: "#192238",
  },
  walletName: {
    color: "#D6DEFF",
    fontSize: 12,
    fontWeight: "700",
  },
  walletAmount: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
  },
  walletFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletMeta: {
    color: "#D5DEFF",
    fontSize: 11,
    fontWeight: "700",
  },
  walletDot: {
    width: 34,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  walletDotActive: {
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  metricStack: {
    gap: 10,
  },
  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "#141D32",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricIconPositive: {
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  metricIconLocked: {
    backgroundColor: "rgba(99, 102, 241, 0.14)",
  },
  metricIconAssign: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
  },
  metricIconText: {
    color: "#C8D1E9",
    fontSize: 16,
    fontWeight: "800",
  },
  metricTextGroup: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    color: "#8D98B2",
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  metricChevron: {
    color: "#8B94AA",
    fontSize: 20,
    fontWeight: "700",
  },
  pendingBadge: {
    color: "#4562FF",
    fontSize: 11,
    fontWeight: "800",
  },
  salaryCard: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
  },
  salaryColumn: {
    flex: 1,
    gap: 8,
  },
  salaryColumnCompact: {
    width: 84,
    alignItems: "flex-end",
    gap: 8,
  },
  salaryLabel: {
    color: "#8D98B2",
    fontSize: 12,
    fontWeight: "700",
  },
  salaryAmount: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  salaryMonths: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  salaryProgressTrack: {
    width: 92,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(148,163,184,0.16)",
  },
  salaryProgressValue: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#4562FF",
  },
  healthCard: {
    borderRadius: 18,
    backgroundColor: "#10192C",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  ringOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderColor: "rgba(148,163,184,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringArc: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderColor: "transparent",
    borderTopColor: "#4562FF",
    borderLeftColor: "#4562FF",
    transform: [{ rotate: "-38deg" }],
  },
  ringInner: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10192C",
  },
  healthScore: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  healthScale: {
    color: "#8D98B2",
    fontSize: 10,
    fontWeight: "800",
  },
  tipCard: {
    borderRadius: 14,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 8,
  },
  tipEyebrow: {
    color: "#7892FF",
    fontSize: 11,
    fontWeight: "800",
  },
  tipText: {
    color: "#C2CDE2",
    fontSize: 13,
    lineHeight: 20,
  },
  insightGrid: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#141D32",
    gap: 6,
    padding: 16,
  },
  insightLabel: {
    color: "#8D98B2",
    fontSize: 12,
    fontWeight: "700",
  },
  insightValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  insightMeta: {
    color: "#1ED198",
    fontSize: 11,
    fontWeight: "700",
  },
});
