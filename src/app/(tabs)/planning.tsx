import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  PlanningSheetStack,
  type ContributionDraft,
  type GoalDraft,
  type PlanningSheetKind,
  type WishDraft,
} from "@/components/planning/planning-sheet-stack";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { addGoalContribution, createGoal } from "@/modules/goals/service";
import {
  createLocalGoal,
  createLocalGoalContribution,
} from "@/modules/goals/types";
import { createLocalLedgerEntry } from "@/modules/ledger/types";
import { createWish } from "@/modules/wishes/service";
import { createLocalWish } from "@/modules/wishes/types";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCommitmentStore } from "@/stores/commitment-store";
import { useLedgerStore } from "@/stores/ledger-store";
import { usePlanningStore } from "@/stores/planning-store";

type PlanningView = "desires" | "commitments" | "insights";
type DesireFilter = "all" | "bought" | "pending";

function dateLabel(value: string | null, month = false) {
  if (!value) {
    return "--";
  }

  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-US", {
    day: month ? undefined : "2-digit",
    month: "short",
    year: month ? "numeric" : undefined,
  });
}

function tip(args: {
  assignableAmount: number;
  goalShortfall: number;
  nextWishAmount: number | null;
}) {
  if (args.assignableAmount > 0 && args.goalShortfall > 0) {
    return `Tienes margen para mover ${args.assignableAmount.toFixed(0)} a metas sin tocar tu reserva.`;
  }

  if (args.nextWishAmount !== null && args.assignableAmount >= args.nextWishAmount) {
    return "Tu primera prioridad ya cabe en el dinero asignable actual.";
  }

  return "Conviene mantener el foco en ahorro estable antes de subir nuevas prioridades.";
}

export default function PlanningScreen() {
  const router = useRouter();
  const [view, setView] = useState<PlanningView>("desires");
  const [filter, setFilter] = useState<DesireFilter>("all");
  const [sheet, setSheet] = useState<PlanningSheetKind>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    deadline: "",
    name: "",
    targetAmount: "",
    walletId: "",
  });
  const [contributionDraft, setContributionDraft] = useState<ContributionDraft>({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    goalId: "",
    note: "",
  });
  const [wishDraft, setWishDraft] = useState<WishDraft>({
    amount: "",
    name: "",
    notes: "",
    priority: "1",
    walletId: "",
  });
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const applyWalletBalanceDelta = useAppStore((state) => state.applyWalletBalanceDelta);
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const goalSnapshots = usePlanningStore((state) => state.goalSnapshots);
  const wishProjections = usePlanningStore((state) => state.wishProjections);
  const currentScore = usePlanningStore((state) => state.currentScore);
  const recentScores = usePlanningStore((state) => state.recentScores);
  const overview = usePlanningStore((state) => state.overview);
  const error = usePlanningStore((state) => state.error);
  const isLoading = usePlanningStore((state) => state.isLoading);
  const isReady = usePlanningStore((state) => state.isReady);
  const refreshPlanningData = usePlanningStore((state) => state.refreshPlanningData);
  const addLocalGoal = usePlanningStore((state) => state.addLocalGoal);
  const addLocalGoalContribution = usePlanningStore(
    (state) => state.addLocalGoalContribution,
  );
  const addLocalWish = usePlanningStore((state) => state.addLocalWish);
  const addLocalEntry = useLedgerStore((state) => state.addLocalEntry);
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);
  const refreshCommitmentData = useCommitmentStore((state) => state.refreshCommitmentData);
  const recurringExpenses = useCommitmentStore((state) => state.recurringExpenses);
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions);
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  useEffect(() => {
    if (!user?.id || !settings) {
      return;
    }

    void refreshPlanningData({ isDevBypass, settings, userId: user.id, wallets });
  }, [isDevBypass, refreshPlanningData, settings, user?.id, wallets]);

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return;
    }

    void refreshCommitmentData({
      isDevBypass,
      month: currentMonth,
      userId: user.id,
      walletId: selectedWalletId,
    });
  }, [
    currentMonth,
    isDevBypass,
    refreshCommitmentData,
    selectedWalletId,
    user?.id,
  ]);

  const activeGoals = goalSnapshots.filter(
    (snapshot) => snapshot.goal.status === "active" || snapshot.status === "at_risk",
  );
  const filteredWishes = useMemo(() => {
    if (filter === "all") {
      return wishProjections;
    }

    if (filter === "bought") {
      return wishProjections.filter((item) => item.wish.isPurchased);
    }

    return wishProjections.filter((item) => !item.wish.isPurchased);
  }, [filter, wishProjections]);
  const pendingGoalAmount = goalSnapshots.reduce(
    (total, snapshot) => total + snapshot.remainingAmount,
    0,
  );
  const nextWishAmount =
    wishProjections.find((projection) => !projection.wish.isPurchased)?.wish
      .estimatedAmount ?? null;
  const coverageDays =
    overview?.monthlyCommitmentAverage && overview.monthlyCommitmentAverage > 0
      ? Math.max(
        0,
        Math.round(
          (Math.max((overview.availableBalance ?? 0) - (overview.committedAmount ?? 0), 0) /
            overview.monthlyCommitmentAverage) *
            30,
        ),
      )
      : 0;
  const savingsRatio =
    overview?.monthlyIncome && overview.monthlyIncome > 0
      ? Math.round(
        ((overview.monthlyGoalContributionAverage ?? 0) / overview.monthlyIncome) *
          100,
      )
      : 0;
  const actionTip = tip({
    assignableAmount: overview?.assignableAmount ?? 0,
    goalShortfall: pendingGoalAmount,
    nextWishAmount,
  });
  const scoreBars = (recentScores.slice(0, 6).reverse().length
    ? recentScores.slice(0, 6).reverse().map((item) => ({
      label: new Date(`${item.weekStart}T00:00:00.000Z`)
        .toLocaleDateString("en-US", { month: "short" })
        .toUpperCase(),
      value: item.score,
    }))
    : [
      { label: "ENE", value: currentScore?.breakdown.liquidity_score ?? 42 },
      { label: "FEB", value: currentScore?.breakdown.commitment_score ?? 56 },
      { label: "MAR", value: currentScore?.breakdown.savings_score ?? 48 },
      { label: "ABR", value: currentScore?.breakdown.salary_stability_score ?? 62 },
      { label: "MAY", value: currentScore?.breakdown.wishlist_pressure_score ?? 58 },
      { label: "JUN", value: currentScore?.score ?? 64 },
    ]) as { label: string; value: number }[];

  function closeSheet() {
    setSheet(null);
    setSheetError(null);
    setIsSubmitting(false);
  }

  function openGoalSheet() {
    setGoalDraft({
      deadline: "",
      name: "",
      targetAmount: "",
      walletId: wallets.find((wallet) => wallet.isActive)?.id ?? "",
    });
    setPickerOpen(false);
    setSheet("goal");
  }

  function openContributionSheet(goalId?: string) {
    setContributionDraft({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      goalId: goalId ?? activeGoals[0]?.goal.id ?? "",
      note: "",
    });
    setPickerOpen(false);
    setSheet("contribution");
  }

  function openWishSheet() {
    const maxPriority = wishProjections.reduce(
      (highest, projection) => Math.max(highest, projection.wish.priority),
      0,
    );

    setWishDraft({
      amount: "",
      name: "",
      notes: "",
      priority: String(maxPriority + 1 || 1),
      walletId: wallets.find((wallet) => wallet.isActive)?.id ?? "",
    });
    setPickerOpen(false);
    setSheet("wish");
  }

  async function refreshAll() {
    if (!user?.id || !settings) {
      return;
    }

    await refreshPlanningData({
      isDevBypass,
      settings,
      userId: user.id,
      wallets: useAppStore.getState().wallets,
    });
  }

  async function handleCreateGoal() {
    if (!user?.id) {
      setSheetError("No hay sesion activa.");
      return;
    }

    const targetAmount = Number(goalDraft.targetAmount);
    if (!goalDraft.name.trim()) {
      setSheetError("Escribe un nombre para la meta.");
      return;
    }
    if (Number.isNaN(targetAmount) || targetAmount <= 0 || !goalDraft.walletId) {
      setSheetError("Completa nombre, monto y wallet.");
      return;
    }

    setIsSubmitting(true);
    setSheetError(null);

    try {
      if (isDevBypass) {
        addLocalGoal(
          createLocalGoal({
            deadline: goalDraft.deadline || null,
            name: goalDraft.name,
            targetAmount,
            userId: user.id,
            walletId: goalDraft.walletId,
          }),
        );
      } else {
        await createGoal({
          deadline: goalDraft.deadline || null,
          name: goalDraft.name,
          targetAmount,
          userId: user.id,
          walletId: goalDraft.walletId,
        });
      }

      await refreshAll();
      closeSheet();
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error ? submitError.message : "No se pudo crear la meta.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleCreateContribution() {
    if (!user?.id) {
      setSheetError("No hay sesion activa.");
      return;
    }

    const amount = Number(contributionDraft.amount);
    const selectedGoal = activeGoals.find(
      (snapshot) => snapshot.goal.id === contributionDraft.goalId,
    )?.goal;

    if (!selectedGoal || Number.isNaN(amount) || amount <= 0) {
      setSheetError("Selecciona una meta valida y un monto mayor que cero.");
      return;
    }

    setIsSubmitting(true);
    setSheetError(null);

    try {
      if (isDevBypass) {
        addLocalGoalContribution(
          createLocalGoalContribution({
            amount,
            date: contributionDraft.date,
            goalId: selectedGoal.id,
            note: contributionDraft.note || null,
            userId: user.id,
            walletId: selectedGoal.walletId,
          }),
        );
        addLocalEntry(
          createLocalLedgerEntry({
            amount: amount * -1,
            date: contributionDraft.date,
            description: contributionDraft.note || selectedGoal.name,
            type: "goal_deposit",
            userId: user.id,
            walletId: selectedGoal.walletId,
          }),
        );
        applyWalletBalanceDelta({ amount: amount * -1, walletId: selectedGoal.walletId });
      } else {
        await addGoalContribution({
          amount,
          date: contributionDraft.date,
          goalId: selectedGoal.id,
          note: contributionDraft.note || null,
          walletId: selectedGoal.walletId,
        });
        await refreshAppData({ isDevBypass: false, userId: user.id });
        if (selectedWalletId) {
          await refreshLedger({
            isDevBypass: false,
            userId: user.id,
            walletId: selectedWalletId,
          });
        }
      }

      await refreshAll();
      closeSheet();
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error ? submitError.message : "No se pudo registrar el aporte.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleCreateWish() {
    if (!user?.id) {
      setSheetError("No hay sesion activa.");
      return;
    }

    const estimatedAmount = Number(wishDraft.amount);
    const priority = Number(wishDraft.priority);

    if (
      !wishDraft.name.trim() ||
      Number.isNaN(estimatedAmount) ||
      estimatedAmount <= 0 ||
      Number.isNaN(priority) ||
      priority <= 0 ||
      !wishDraft.walletId
    ) {
      setSheetError("Completa nombre, monto, prioridad y wallet.");
      return;
    }

    setIsSubmitting(true);
    setSheetError(null);

    try {
      if (isDevBypass) {
        addLocalWish(
          createLocalWish({
            estimatedAmount,
            name: wishDraft.name,
            notes: wishDraft.notes || null,
            priority,
            userId: user.id,
            walletId: wishDraft.walletId,
          }),
        );
      } else {
        await createWish({
          estimatedAmount,
          name: wishDraft.name,
          notes: wishDraft.notes || null,
          priority,
          userId: user.id,
          walletId: wishDraft.walletId,
        });
      }

      await refreshAll();
      closeSheet();
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error ? submitError.message : "No se pudo crear el deseo.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        primaryAction={{ icon: "plus", onPress: () => setPickerOpen(true) }}
        secondaryAction={{
          icon: "bell",
          onPress: () => router.push("/notifications"),
          showBadge: true,
        }}
        title="Planificacion"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          onChange={setView}
          options={[
            { label: "Deseos", value: "desires" },
            { label: "Compromisos", value: "commitments" },
            { label: "Insights", value: "insights" },
          ]}
          value={view}
        />

        {!isReady && isLoading ? (
          <View style={styles.cardCenter}>
            <ActivityIndicator color="#4664FF" />
            <Text style={styles.softText}>Calculando planificacion...</Text>
          </View>
        ) : error ? (
          <View style={styles.cardCenter}>
            <Text style={styles.cardTitle}>No se pudo cargar</Text>
            <Text style={styles.softText}>{error}</Text>
          </View>
        ) : view === "desires" ? (
          <>
            <SegmentedControl
              compact
              onChange={setFilter}
              options={[
                { label: "Todos", value: "all" },
                { label: "Pendientes", value: "pending" },
                { label: "Comprados", value: "bought" },
              ]}
              value={filter}
            />

            <Text style={styles.sectionTitle}>Prioridades</Text>

            {filteredWishes.map((item) => (
              <View
                key={item.wish.id}
                style={[styles.card, item.wish.isPurchased && styles.cardDim]}
              >
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, item.wish.isPurchased && styles.strike]}>
                    {item.wish.name}
                  </Text>
                  <Text style={styles.price}>${item.wish.estimatedAmount.toFixed(0)}</Text>
                </View>
                <Text style={styles.pill}>
                  {item.wish.isPurchased
                    ? "COMPRADO"
                    : item.confidenceLevel === "high"
                      ? "IA: High Confidence"
                      : item.confidenceLevel === "medium"
                        ? "IA: Medium"
                        : item.confidenceLevel === "low"
                          ? "IA: Low"
                          : "IA: Risky"}
                </Text>
                <Text style={styles.bodyText}>{item.wish.notes ?? item.confidenceReason}</Text>
                <Text style={styles.softText}>
                  {item.wish.isPurchased
                    ? "Successfully budgeted in June"
                    : `Requires ${item.monthsUntilPurchase ?? "more"} ${
                        item.monthsUntilPurchase === 1 ? "month" : "months"
                      } of saving`}
                </Text>
                <View style={styles.rowBetween}>
                  <View style={styles.inlineRow}>
                    <MaterialCommunityIcons color="#7C89A8" name="calendar-month-outline" size={13} />
                    <Text style={styles.softText}>
                      {item.wish.isPurchased
                        ? dateLabel(item.wish.purchasedAt?.slice(0, 10) ?? null, true)
                        : dateLabel(item.estimatedPurchaseDate)}
                    </Text>
                  </View>
                  {!item.wish.isPurchased ? (
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.trackFill,
                          { width: `${Math.max(item.progressRatio * 100, 18)}%` },
                        ]}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            ))}

            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons color="#6C83FF" name="bulb-outline" size={18} />
              </View>
              <View style={styles.tipBody}>
                <Text style={styles.tipTitle}>TIP DE IA</Text>
                <Text style={styles.bodyText}>{actionTip}</Text>
              </View>
            </View>
          </>
        ) : view === "commitments" ? (
          <>
            <Text style={styles.sectionTitle}>Fijos</Text>
            {recurringExpenses
              .filter((item) => item.walletId === selectedWalletId && item.isActive)
              .map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.price}>${item.amount.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.softText}>
                    {item.frequency === "monthly"
                      ? `Mensual - dia ${String(item.billingDay).padStart(2, "0")}`
                      : `Anual - ${String(item.billingDay).padStart(2, "0")}/${String(
                          item.billingMonth ?? 1,
                        ).padStart(2, "0")}`}
                  </Text>
                  {item.notes ? <Text style={styles.bodyText}>{item.notes}</Text> : null}
                </View>
              ))}

            <Text style={styles.sectionTitle}>Eventos Especiales</Text>
            {budgetProvisions
              .filter((item) => item.walletId === selectedWalletId && item.isActive)
              .map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.price}>${item.amount.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.softText}>
                    {item.recurrence === "yearly" ? "Anual" : "Una vez"} -{" "}
                    {dateLabel(item.month, true)}
                  </Text>
                  {item.notes ? <Text style={styles.bodyText}>{item.notes}</Text> : null}
                </View>
              ))}
          </>
        ) : (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>AI Score Semanal</Text>
              <Text style={styles.linkText}>Actualizado hace 2h</Text>
            </View>

            <View style={styles.grid}>
              <View style={styles.metric}>
                <Ionicons color="#6C83FF" name="water-outline" size={14} />
                <Text style={styles.metricValue}>
                  {currentScore?.breakdown.liquidity_score ?? 0}
                  <Text style={styles.metricScale}>/100</Text>
                </Text>
                <Text style={styles.metricLabel}>LIQUIDEZ</Text>
              </View>
              <View style={styles.metric}>
                <MaterialCommunityIcons color="#F59E0B" name="briefcase-clock-outline" size={14} />
                <Text style={styles.metricValue}>
                  {Math.max(0, 100 - (currentScore?.breakdown.commitment_score ?? 0))}%
                </Text>
                <Text style={styles.metricLabel}>COMPROMISOS</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons color="#2AD596" name="shield-checkmark-outline" size={14} />
                <Text style={styles.metricValue}>
                  {(currentScore?.breakdown.salary_stability_score ?? 0) >= 70 ? "Alta" : "Media"}
                </Text>
                <Text style={styles.metricLabel}>ESTABILIDAD</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons color="#6C83FF" name="trending-up-outline" size={14} />
                <Text style={styles.metricValue}>{Math.max(savingsRatio, 0)}%</Text>
                <Text style={styles.metricLabel}>RATIO AHORRO</Text>
              </View>
            </View>

            <View style={styles.cardWide}>
              <View>
                <Text style={styles.softText}>Tu dinero dura</Text>
                <Text style={styles.days}>{coverageDays} dias</Text>
              </View>
              <View style={styles.hourglass}>
                <MaterialCommunityIcons color="#E1E7F8" name="timer-sand" size={18} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.softText}>Sin ingresos (Promedio)</Text>
              <Text style={styles.cardTitle}>
                {overview?.monthlyIncome
                  ? `${(
                      Math.max(overview.availableBalance - overview.committedAmount, 0) /
                      overview.monthlyIncome
                    ).toFixed(1)} meses de vida`
                  : "0.0 meses de vida"}
              </Text>
              <View style={styles.trackLong}>
                <View style={[styles.trackFillGreen, { width: `${Math.max(coverageDays * 1.8, 18)}%` }]} />
              </View>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Ingresos vs Gastos</Text>
              <Text style={styles.softText}>Ultimos 6 meses</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.chart}>
                {scoreBars.map((bar) => (
                  <View key={bar.label} style={styles.chartGroup}>
                    <View style={styles.chartCols}>
                      <View style={[styles.chartBar, { height: Math.max(26, bar.value * 0.72) }]} />
                      <View style={[styles.chartBar, styles.chartBarMuted, { height: Math.max(22, (bar.value - 10) * 0.7) }]} />
                    </View>
                    <Text style={styles.chartLabel}>{bar.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Reporte Narrativo IA</Text>
            <View style={styles.card}>
              <Text style={styles.bodyText}>
                {savingsRatio > 0
                  ? `Este mes has logrado reducir tus gastos hormiga en un ${Math.min(
                      savingsRatio,
                      14,
                    )}%. Tus ingresos han sido estables, pero el ratio de ahorro ha crecido gracias a la optimizacion de suscripciones.`
                  : "Tu estructura actual mantiene liquidez, pero todavia depende de convertir parte del dinero libre en ahorro sostenido."}
              </Text>
              <Text style={styles.bodyText}>
                Si mantienes este ritmo, alcanzaras tu meta de fondo operativo en al menos {Math.max(coverageDays, 30)} dias.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons color="#6C83FF" name="sparkles-outline" size={18} />
              </View>
              <View style={styles.tipBody}>
                <Text style={styles.tipTitle}>TIP DE IA</Text>
                <Text style={styles.bodyText}>
                  Detectamos un excedente de ${(overview?.assignableAmount ?? 0).toFixed(0)} en tu cuenta corriente. Moverlo hoy a tu cuenta de ahorros generaria un rendimiento extra solo en intereses.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheet onClose={() => setPickerOpen(false)} visible={pickerOpen}>
        <Text style={styles.sheetTitle}>Acciones de planificacion</Text>
        <Text style={styles.softText}>
          Todas las altas salen por BottomSheet para mantener el flujo limpio.
        </Text>
        <View style={styles.sheetGrid}>
          <Pressable onPress={openGoalSheet} style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}>
            <Ionicons color="#6C83FF" name="flag-outline" size={20} />
            <Text style={styles.sheetActionText}>Nueva Meta</Text>
          </Pressable>
          <Pressable onPress={() => openContributionSheet()} style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}>
            <Feather color="#2AD596" name="plus" size={20} />
            <Text style={styles.sheetActionText}>Registrar Aporte</Text>
          </Pressable>
          <Pressable onPress={openWishSheet} style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}>
            <Ionicons color="#F59E0B" name="sparkles-outline" size={20} />
            <Text style={styles.sheetActionText}>Nuevo Deseo</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <PlanningSheetStack
        activeGoals={activeGoals}
        contributionDraft={contributionDraft}
        goalDraft={goalDraft}
        isSubmitting={isSubmitting}
        onClose={closeSheet}
        onSubmitContribution={() => void handleCreateContribution()}
        onSubmitGoal={() => void handleCreateGoal()}
        onSubmitWish={() => void handleCreateWish()}
        setContributionDraft={setContributionDraft}
        setGoalDraft={setGoalDraft}
        setWishDraft={setWishDraft}
        sheet={sheet}
        sheetError={sheetError}
        wallets={wallets}
        wishDraft={wishDraft}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1020" },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 104, gap: 14 },
  sectionTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  card: {
    borderRadius: 14,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  cardWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardCenter: {
    borderRadius: 14,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    alignItems: "center",
    padding: 18,
    gap: 10,
  },
  cardDim: { opacity: 0.52 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardTitle: { color: "#F8FAFC", fontSize: 15, fontWeight: "800", flex: 1 },
  strike: { textDecorationLine: "line-through" },
  price: { color: "#4B69FF", fontSize: 15, fontWeight: "800" },
  pill: { color: "#8AE6C0", fontSize: 10, fontWeight: "800" },
  bodyText: { color: "#CBD4EA", fontSize: 13, lineHeight: 19 },
  softText: { color: "#8A96B3", fontSize: 12, lineHeight: 18 },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(75, 105, 255, 0.22)",
    backgroundColor: "rgba(22, 30, 52, 0.90)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(49, 68, 138, 0.28)",
  },
  tipBody: { flex: 1, gap: 6 },
  tipTitle: { color: "#4F6DFF", fontSize: 11, fontWeight: "900" },
  track: { width: 72, height: 4, borderRadius: 999, backgroundColor: "rgba(92, 103, 135, 0.34)", overflow: "hidden" },
  trackLong: { height: 5, borderRadius: 999, backgroundColor: "rgba(92, 103, 135, 0.34)", overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 999, backgroundColor: "#4B69FF" },
  trackFillGreen: { height: "100%", borderRadius: 999, backgroundColor: "#20D396" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 148,
    borderRadius: 12,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  metricValue: { color: "#F8FAFC", fontSize: 28, fontWeight: "900" },
  metricScale: { color: "#94A1BE", fontSize: 11, fontWeight: "800" },
  metricLabel: { color: "#8A96B3", fontSize: 11, fontWeight: "800" },
  days: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  hourglass: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(54, 71, 156, 0.28)",
  },
  linkText: { color: "#4F6DFF", fontSize: 10, fontWeight: "700" },
  chart: { minHeight: 160, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  chartGroup: { flex: 1, alignItems: "center", gap: 8 },
  chartCols: { minHeight: 126, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  chartBar: { width: 6, borderRadius: 999, backgroundColor: "#4B69FF" },
  chartBarMuted: { backgroundColor: "rgba(84, 102, 158, 0.62)" },
  chartLabel: { color: "#7C89A8", fontSize: 10, fontWeight: "700" },
  sheetTitle: { color: "#F8FAFC", fontSize: 24, fontWeight: "900", marginBottom: 8 },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 18 },
  sheetAction: {
    width: "48%",
    borderRadius: 16,
    backgroundColor: "rgba(24, 30, 51, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(84, 101, 146, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 18,
    gap: 12,
  },
  sheetActionText: { color: "#F8FAFC", fontSize: 14, fontWeight: "800", textAlign: "center" },
  pressed: { opacity: 0.88 },
});
