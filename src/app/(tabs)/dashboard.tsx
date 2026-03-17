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
import { theme } from "@/utils/theme";

function formatMoney(value: number) {
  return `${value.toFixed(2)}`;
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
  const visibleWallets = wallets.filter((wallet) => wallet.isActive);

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
        <Text style={styles.sectionTitle}>Tus wallets</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walletsRow}
        >
          {visibleWallets.length > 0 ? (
            visibleWallets.map((wallet, index) => {
              const isActive = wallet.id === selectedWalletId;
              const min = visibleWallets.length === 1 ? viewportWidth : viewportWidth * 0.85
              return (
                <Pressable
                  key={wallet.id}
                  onPress={() => setSelectedWalletId(wallet.id)}
                  style={({ pressed }) => [
                    styles.walletCard,
                    { width: min - 32 },
                    isActive ? styles.walletCardActive : styles.walletCardMuted,
                    !isActive && index % 2 === 1 && styles.walletCardMutedAlt,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.walletName}>{wallet.name}</Text>
                  <Text style={styles.walletAmount}>
                    {formatMoney(wallet.balance)}
                  </Text>
                  <View style={styles.walletFooter}>
                    <Text style={styles.walletMeta}>
                      {wallet.currency}
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

        <Text style={styles.sectionTitle}>Detalle de wallet activa</Text>

        <View style={styles.metricStack}>
          <MetricCard
            amount={`${formatMoney(activeWallet?.balance ?? 0)} ${activeWallet?.currency ?? null}`}
            icon="bank"
            iconTone="green"
            label="Balance disponible"
          />
          <MetricCard
            amount={`${formatMoney(committedAmount)} ${activeWallet?.currency ?? null}`}
            icon="lock"
            iconTone="blue"
            label="Fondos comprometidos"
          />
          <MetricCard
            amount={`${formatMoney(assignableAmount)} ${activeWallet?.currency ?? null}`}
            icon="wallet"
            iconTone="orange"
            label="Monto asignable"
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Estado salarial</Text>
          <Text style={styles.badge}>PENDIENTE</Text>
        </View>

        <View style={styles.salaryCard}>
          <View style={styles.salaryMain}>
            <Text style={styles.salaryLabel}>Pendiente por recibir</Text>
            <Text style={styles.salaryValue}>
              {formatMoney(effectiveSalaryOverview?.pendingTotal ?? 0)} {activeWallet?.currency ?? settings?.primaryCurrency ?? "USD"}
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
            <Text style={styles.salaryLabel}>Meses pendientes</Text>
            <Text style={styles.salaryMonths}>
              {effectiveSalaryOverview?.monthsWithoutPayment ?? 0}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Salud financiera</Text>

        <View style={styles.healthCard}>
          <View style={styles.ringTrack}>
            <View style={[styles.ringArc, { transform: [{ rotate: ringRotation }] }]} />
            <View style={styles.ringInner}>
              <Text style={styles.healthValue}>{healthScore}</Text>
              <Text style={styles.healthMeta}>PUNTAJE / 100</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons color="#5E7BFF" name="sparkles-outline" size={15} />
          </View>
          <View style={styles.tipBody}>
            <Text style={styles.tipEyebrow}>TIP IA</Text>
            <Text style={styles.tipText}>
              Reducir 10% los gastos de comida este mes puede mejorar tu
              puntaje en 4 puntos. Prueba automatizar tu presupuesto.
            </Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Insights rapidos</Text>
          <Pressable onPress={() => router.push("/insights")} style={({ pressed }) => [styles.insightLink, pressed && styles.pressed]}>
            <Text style={styles.insightLinkText}>Ver todos</Text>
          </Pressable>
        </View>

        <View style={styles.insightGrid}>
          <View style={styles.insightCard}>
            <View style={styles.insightIconBlue}>
              <Ionicons color="#6C83FF" name="trending-up-outline" size={15} />
            </View>
            <Text style={styles.insightLabel}>Crecimiento</Text>
            <Text style={styles.insightValue}>
              +{liquidityRatio * 100 > 0 ? Math.round(liquidityRatio * 12.4) : 0}.4%
            </Text>
            <Text style={styles.insightMetaPositive}>+ $1,200 este mes</Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIconRed}>
              <Ionicons color="#FF6B6D" name="warning-outline" size={15} />
            </View>
            <Text style={styles.insightLabel}>Alerta de presupuesto</Text>
            <Text style={styles.insightValue}>{budgetAlert}%</Text>
            <Text style={styles.insightMetaNegative}>Limite de ocio</Text>
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  insightLink: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(84, 101, 146, 0.25)",
    backgroundColor: "rgba(24, 30, 51, 0.96)",
  },
  insightLinkText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  walletsRow: {
    gap: 12,
    paddingRight: 4,
  },
  walletCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  walletCardActive: {
    backgroundColor: theme.colors.primary,
  },
  walletCardMuted: {
    backgroundColor: theme.colors.grayDark,
  },
  walletCardMutedAlt: {
    backgroundColor: theme.colors.grayDark,
  },
  walletName: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  walletAmount: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: "700",
  },
  walletFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletMeta: {
    color: theme.colors.grayLight,
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
    backgroundColor: theme.colors.backgroundCard,
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
    backgroundColor: theme.colors.greenSoft,
  },
  metricIconBlue: {
    backgroundColor: theme.colors.blueSoft,
  },
  metricIconOrange: {
    backgroundColor: theme.colors.yellowSoft,
  },
  metricBody: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    color: theme.colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  badge: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  salaryCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
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
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: "700",
  },
  salaryValue: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  salaryMonths: {
    color: theme.colors.white,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 36,
  },
  progressTrack: {
    width: 92,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: theme.colors.grayDark,
  },
  progressValue: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  healthCard: {
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  ringTrack: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderColor: theme.colors.grayDark,
    alignItems: "center",
    justifyContent: "center",
  },
  ringArc: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderTopColor: theme.colors.primary,
    borderLeftColor: theme.colors.primary,
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  ringInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundCard,
  },
  healthValue: {
    color: theme.colors.white,
    fontSize: 34,
    fontWeight: "700",
  },
  healthMeta: {
    color: theme.colors.grayLight,
    fontSize: 10,
    fontWeight: "700",
  },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.blueSoft,
  },
  tipBody: {
    flex: 1,
    gap: 5,
  },
  tipEyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  tipText: {
    color: theme.colors.grayLight,
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
    backgroundColor: theme.colors.backgroundCard,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 7,
  },
  insightIconBlue: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.blueSoft,
  },
  insightIconRed: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.redSoft,
  },
  insightLabel: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: "700",
  },
  insightValue: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: "700",
  },
  insightMetaPositive: {
    color: theme.colors.green,
    fontSize: 10,
    fontWeight: "700",
  },
  insightMetaNegative: {
    color: theme.colors.red,
    fontSize: 10,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});

