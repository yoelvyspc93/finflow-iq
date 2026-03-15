import { useEffect, useMemo } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { selectActiveWallet } from "@/modules/ledger/selectors";
import { calculateSalaryOverview } from "@/modules/salary/calculations";
import {
  createMockSalaryPayments,
  createMockSalaryPeriods,
} from "@/modules/salary/types";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
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

function MetricCard({
  amount,
  icon,
  iconTone,
  label,
}: {
  amount: string;
  icon: "bank" | "lock" | "wallet";
  iconTone: "green" | "blue" | "orange";
  label: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View
        style={[
          styles.metricIcon,
          iconTone === "green"
            ? styles.metricIconGreen
            : iconTone === "blue"
              ? styles.metricIconBlue
              : styles.metricIconOrange,
        ]}
      >
        {icon === "bank" ? (
          <MaterialCommunityIcons color="#3CD98F" name="bank-outline" size={17} />
        ) : null}
        {icon === "lock" ? (
          <Ionicons color="#6E81FF" name="lock-closed-outline" size={16} />
        ) : null}
        {icon === "wallet" ? (
          <Feather color="#F59E0B" name="briefcase" size={15} />
        ) : null}
      </View>

      <View style={styles.metricBody}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{amount}</Text>
      </View>

      <Feather color="#7C89A8" name="chevron-right" size={18} />
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
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
  const assignableAmount = Math.max(0, freeAmount - reserveAmount);
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
  const ringRotation = `${Math.round(clamp(healthScore / 100, 0.12, 1) * 280)}deg`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        secondaryAction={{
          icon: "bell",
          onPress: () => router.push("/notifications"),
          showBadge: true,
        }}
        showBrand
        title="FinFlow IQ"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Your Wallets</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walletsRow}
        >
          {wallets.length > 0 ? (
            wallets.map((wallet, index) => {
              const isActive = wallet.id === selectedWalletId;

              return (
                <Pressable
                  key={wallet.id}
                  onPress={() => setSelectedWalletId(wallet.id)}
                  style={({ pressed }) => [
                    styles.walletCard,
                    { width: Math.min(viewportWidth * 0.8, 320) },
                    isActive ? styles.walletCardActive : styles.walletCardMuted,
                    !isActive && index % 2 === 1 && styles.walletCardMutedAlt,
                    pressed && styles.pressed,
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
                        styles.walletToggle,
                        isActive && styles.walletToggleActive,
                      ]}
                    >
                      <View style={styles.walletKnob} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={[styles.walletCard, styles.walletCardMuted]}>
              <Text style={styles.walletName}>Sin wallets</Text>
              <Text style={styles.walletAmount}>USD 0.00</Text>
              <Text style={styles.walletMeta}>Completa el onboarding inicial</Text>
            </View>
          )}
        </ScrollView>

        <Text style={styles.sectionTitle}>Active Wallet Details</Text>

        <View style={styles.metricStack}>
          <MetricCard
            amount={formatMoney(activeWallet?.currency ?? null, activeWallet?.balance ?? 0)}
            icon="bank"
            iconTone="green"
            label="Available Balance"
          />
          <MetricCard
            amount={formatMoney(activeWallet?.currency ?? null, committedAmount)}
            icon="lock"
            iconTone="blue"
            label="Committed Funds"
          />
          <MetricCard
            amount={formatMoney(activeWallet?.currency ?? null, assignableAmount)}
            icon="wallet"
            iconTone="orange"
            label="Assignable Amount"
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Salary Outlook</Text>
          <Text style={styles.badge}>PENDING</Text>
        </View>

        <View style={styles.salaryCard}>
          <View style={styles.salaryMain}>
            <Text style={styles.salaryLabel}>Remaining to receive</Text>
            <Text style={styles.salaryValue}>
              {formatMoney(
                activeWallet?.currency ?? settings?.primaryCurrency ?? "USD",
                effectiveSalaryOverview?.pendingTotal ?? 0,
              )}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressValue,
                  {
                    width: `${clamp(
                      ((effectiveSalaryOverview?.pendingTotal ?? 0) /
                        Math.max((effectiveSalaryOverview?.pendingTotal ?? 0) + 1, 1)) *
                      100,
                      16,
                      82,
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.salaryAside}>
            <Text style={styles.salaryLabel}>Months left</Text>
            <Text style={styles.salaryMonths}>
              {effectiveSalaryOverview?.monthsWithoutPayment ?? 0}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Financial Health</Text>

        <View style={styles.healthCard}>
          <View style={styles.ringTrack}>
            <View style={[styles.ringArc, { transform: [{ rotate: ringRotation }] }]} />
            <View style={styles.ringInner}>
              <Text style={styles.healthValue}>{healthScore}</Text>
              <Text style={styles.healthMeta}>SCORE / 100</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons color="#5E7BFF" name="sparkles-outline" size={15} />
          </View>
          <View style={styles.tipBody}>
            <Text style={styles.tipEyebrow}>AI TIP</Text>
            <Text style={styles.tipText}>
              Reducing your dining expenses by 10% this month could boost your
              score by 4 points. Try our budget automation!
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Insights</Text>

        <View style={styles.insightGrid}>
          <View style={styles.insightCard}>
            <View style={styles.insightIconBlue}>
              <Ionicons color="#6C83FF" name="trending-up-outline" size={15} />
            </View>
            <Text style={styles.insightLabel}>Investment Growth</Text>
            <Text style={styles.insightValue}>
              +{liquidityRatio * 100 > 0 ? Math.round(liquidityRatio * 12.4) : 0}.4%
            </Text>
            <Text style={styles.insightMetaPositive}>▲ $1,200 this month</Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIconRed}>
              <Ionicons color="#FF6B6D" name="warning-outline" size={15} />
            </View>
            <Text style={styles.insightLabel}>Budget Alert</Text>
            <Text style={styles.insightValue}>{budgetAlert}%</Text>
            <Text style={styles.insightMetaNegative}>Entertainment limit</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B1020",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 104,
    gap: 14,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  walletsRow: {
    gap: 12,
    paddingRight: 4,
  },
  walletCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  walletCardActive: {
    backgroundColor: "#4A66FF",
  },
  walletCardMuted: {
    backgroundColor: "rgba(25, 33, 54, 0.96)",
  },
  walletCardMutedAlt: {
    backgroundColor: "rgba(29, 35, 54, 0.90)",
  },
  walletName: {
    color: "#D7E0FF",
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
    color: "#D8E1FF",
    fontSize: 11,
    fontWeight: "700",
  },
  walletToggle: {
    width: 34,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  walletToggleActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "flex-end",
  },
  walletKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.60)",
  },
  metricStack: {
    gap: 8,
  },
  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "rgba(20, 27, 46, 0.96)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricIconGreen: {
    backgroundColor: "rgba(18, 109, 77, 0.24)",
  },
  metricIconBlue: {
    backgroundColor: "rgba(54, 71, 156, 0.24)",
  },
  metricIconOrange: {
    backgroundColor: "rgba(111, 77, 18, 0.28)",
  },
  metricBody: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    color: "#8A96B3",
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  badge: {
    color: "#4664FF",
    fontSize: 10,
    fontWeight: "900",
  },
  salaryCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "rgba(20, 27, 46, 0.96)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  salaryMain: {
    flex: 1,
    gap: 8,
  },
  salaryAside: {
    width: 82,
    alignItems: "flex-end",
    gap: 6,
  },
  salaryLabel: {
    color: "#8A96B3",
    fontSize: 11,
    fontWeight: "700",
  },
  salaryValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  salaryMonths: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
  },
  progressTrack: {
    width: 92,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(118, 130, 165, 0.26)",
  },
  progressValue: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#4C68FF",
  },
  healthCard: {
    borderRadius: 18,
    backgroundColor: "rgba(16, 24, 42, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  ringTrack: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderColor: "rgba(78, 92, 130, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringArc: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderTopColor: "#4B69FF",
    borderLeftColor: "#4B69FF",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  ringInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E1527",
  },
  healthValue: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  healthMeta: {
    color: "#8A96B3",
    fontSize: 10,
    fontWeight: "800",
  },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "rgba(20, 27, 46, 0.96)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(52, 73, 145, 0.28)",
  },
  tipBody: {
    flex: 1,
    gap: 5,
  },
  tipEyebrow: {
    color: "#6C83FF",
    fontSize: 10,
    fontWeight: "900",
  },
  tipText: {
    color: "#C6D0E8",
    fontSize: 12,
    lineHeight: 18,
  },
  insightGrid: {
    flexDirection: "row",
    gap: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(20, 27, 46, 0.96)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 7,
  },
  insightIconBlue: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(40, 56, 108, 0.34)",
  },
  insightIconRed: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(93, 38, 46, 0.34)",
  },
  insightLabel: {
    color: "#8A96B3",
    fontSize: 11,
    fontWeight: "700",
  },
  insightValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  insightMetaPositive: {
    color: "#2BD991",
    fontSize: 10,
    fontWeight: "700",
  },
  insightMetaNegative: {
    color: "#FF6B6D",
    fontSize: 10,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});
