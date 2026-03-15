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

import {
  PlanningSheetStack,
  type ContributionDraft,
  type GoalDraft,
  type PlanningSheetKind,
  type WishDraft,
} from "@/components/planning/planning-sheet-stack";
import { DecorativeBackground } from "@/components/ui/decorative-background";
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
import { useLedgerStore } from "@/stores/ledger-store";
import { usePlanningStore } from "@/stores/planning-store";

type PlanningView = "desires" | "insights";
type DesireFilter = "all" | "bought" | "pending";

function ActionPill({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}>
      <Text style={styles.actionPillText}>{label}</Text>
    </Pressable>
  );
}

function formatMoney(currency: string, value: number) {
  return `${currency} ${value.toFixed(2)}`;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function formatWeekLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return `S${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
}

function getConfidenceLabel(value: "high" | "medium" | "low" | "risky") {
  switch (value) {
    case "high":
      return "Alta confianza";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
    default:
      return "Riesgo";
  }
}

function buildPlanningTip(args: {
  assignableAmount: number;
  goalShortfall: number;
  nextWishAmount: number | null;
}) {
  if (args.assignableAmount > 0 && args.goalShortfall > 0) {
    return `Tienes margen para mover ${args.assignableAmount.toFixed(
      2,
    )} a metas sin tocar tu reserva.`;
  }

  if (args.nextWishAmount !== null && args.assignableAmount >= args.nextWishAmount) {
    return "Tu primera prioridad ya cabe en el dinero asignable actual.";
  }

  return "Conviene mantener el foco en ahorro estable antes de subir nuevas prioridades.";
}

export default function PlanningScreen() {
  const [view, setView] = useState<PlanningView>("desires");
  const [filter, setFilter] = useState<DesireFilter>("all");
  const [sheet, setSheet] = useState<PlanningSheetKind>(null);
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

  useEffect(() => {
    if (!user?.id || !settings) {
      return;
    }

    void refreshPlanningData({
      isDevBypass,
      settings,
      userId: user.id,
      wallets,
    });
  }, [isDevBypass, refreshPlanningData, settings, user?.id, wallets]);

  const currency = wallets.find((wallet) => wallet.isActive)?.currency ?? "USD";
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

  const scoreChart = useMemo(() => {
    const history = recentScores.slice(0, 6).reverse();

    if (history.length > 0) {
      return history.map((item) => ({
        label: formatWeekLabel(item.weekStart),
        value: item.score,
      }));
    }

    if (!currentScore) {
      return [];
    }

    return [
      {
        label: "Liq",
        value: currentScore.breakdown.liquidity_score,
      },
      {
        label: "Comp",
        value: currentScore.breakdown.commitment_score,
      },
      {
        label: "Aho",
        value: currentScore.breakdown.savings_score,
      },
      {
        label: "Sal",
        value: currentScore.breakdown.salary_stability_score,
      },
      {
        label: "Wish",
        value: currentScore.breakdown.wishlist_pressure_score,
      },
    ];
  }, [currentScore, recentScores]);

  const pendingGoalAmount = useMemo(
    () =>
      goalSnapshots.reduce(
        (total, snapshot) => total + snapshot.remainingAmount,
        0,
      ),
    [goalSnapshots],
  );
  const nextWishAmount =
    wishProjections.find((projection) => !projection.wish.isPurchased)?.wish
      .estimatedAmount ?? null;
  const coverageDays =
    overview?.monthlyCommitmentAverage && overview.monthlyCommitmentAverage > 0
      ? Math.max(
        0,
        Math.round(
          (Math.max(
            (overview.availableBalance ?? 0) - (overview.committedAmount ?? 0),
            0,
          ) /
            overview.monthlyCommitmentAverage) *
          30,
        ),
      )
      : 0;
  const actionTip = buildPlanningTip({
    assignableAmount: overview?.assignableAmount ?? 0,
    goalShortfall: pendingGoalAmount,
    nextWishAmount,
  });

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
    setSheetError(null);
    setSheet("goal");
  }

  function openContributionSheet(goalId?: string) {
    setContributionDraft({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      goalId: goalId ?? activeGoals[0]?.goal.id ?? "",
      note: "",
    });
    setSheetError(null);
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
    setSheetError(null);
    setSheet("wish");
  }

  async function rerunPlanningRefresh() {
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

    if (Number.isNaN(targetAmount) || targetAmount <= 0) {
      setSheetError("El monto objetivo debe ser mayor que cero.");
      return;
    }

    if (!goalDraft.walletId) {
      setSheetError("Selecciona una wallet.");
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

      await rerunPlanningRefresh();
      closeSheet();
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear la meta.",
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

    if (!selectedGoal) {
      setSheetError("Selecciona una meta valida.");
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      setSheetError("El aporte debe ser mayor que cero.");
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
        applyWalletBalanceDelta({
          amount: amount * -1,
          walletId: selectedGoal.walletId,
        });
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

      await rerunPlanningRefresh();
      closeSheet();
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar el aporte.",
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

    if (!wishDraft.name.trim()) {
      setSheetError("Escribe un nombre para el deseo.");
      return;
    }

    if (Number.isNaN(estimatedAmount) || estimatedAmount <= 0) {
      setSheetError("El monto estimado debe ser mayor que cero.");
      return;
    }

    if (Number.isNaN(priority) || priority <= 0) {
      setSheetError("La prioridad debe ser un numero mayor que cero.");
      return;
    }

    if (!wishDraft.walletId) {
      setSheetError("Selecciona una wallet.");
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

      await rerunPlanningRefresh();
      closeSheet();
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el deseo.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.border} />
      <ScreenHeader title="Planificacion" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          onChange={setView}
          options={[
            { label: "Deseos", value: "desires" },
            { label: "Insights", value: "insights" },
          ]}
          value={view}
        />

        {view === "desires" ? (
          <View style={styles.actionRow}>
            <ActionPill label="+ Meta" onPress={openGoalSheet} />
            <ActionPill label="+ Aporte" onPress={() => openContributionSheet()} />
            <ActionPill label="+ Deseo" onPress={openWishSheet} />
          </View>
        ) : null}

        {!isReady && isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#4562FF" />
            <Text style={styles.stateText}>Calculando planificacion...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No se pudo cargar</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : view === "desires" ? (
          <>
            <Text style={styles.sectionTitle}>Metas activas</Text>

            {goalSnapshots.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Sin metas todavia</Text>
                <Text style={styles.stateText}>
                  Crea tu primera meta desde el boton superior y empieza a medir
                  progreso real.
                </Text>
              </View>
            ) : (
              goalSnapshots.map((snapshot) => (
                <View key={snapshot.goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>{snapshot.goal.name}</Text>
                    <Text style={styles.goalAmount}>
                      {formatMoney(currency, snapshot.contributedAmount)} /{" "}
                      {formatMoney(currency, snapshot.goal.targetAmount)}
                    </Text>
                  </View>
                  <Text style={styles.goalMeta}>
                    {snapshot.status === "at_risk"
                      ? "Meta vencida; necesita recuperar ritmo."
                      : snapshot.projectedCompletionDate
                        ? `Proyeccion: ${formatDateLabel(snapshot.projectedCompletionDate)}`
                        : "Sin suficiente historial para proyectar fecha."}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressValue,
                        { width: `${snapshot.progressRatio * 100}%` },
                      ]}
                    />
                  </View>
                  <Pressable
                    onPress={() => openContributionSheet(snapshot.goal.id)}
                    style={({ pressed }) => [
                      styles.inlineAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.inlineActionText}>Registrar aporte</Text>
                  </Pressable>
                </View>
              ))
            )}

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

            <Text style={styles.sectionTitle}>Wishlist priorizada</Text>

            {filteredWishes.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Sin items para mostrar</Text>
                <Text style={styles.stateText}>
                  Cuando agregues deseos, aqui apareceran con fecha estimada y
                  nivel de confianza.
                </Text>
              </View>
            ) : (
              filteredWishes.map((item) => (
                <View
                  key={item.wish.id}
                  style={[
                    styles.wishCard,
                    item.wish.isPurchased && styles.wishCardDimmed,
                  ]}
                >
                  <View style={styles.wishHeader}>
                    <Text style={styles.wishTitle}>{item.wish.name}</Text>
                    <Text style={styles.wishPrice}>
                      {formatMoney(currency, item.wish.estimatedAmount)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.wishConfidence,
                      item.confidenceLevel === "high"
                        ? styles.wishConfidenceHigh
                        : item.confidenceLevel === "medium"
                          ? styles.wishConfidenceMedium
                          : item.confidenceLevel === "low"
                            ? styles.wishConfidenceLow
                            : styles.wishConfidenceRisky,
                    ]}
                  >
                    {getConfidenceLabel(item.confidenceLevel)}
                  </Text>
                  <Text style={styles.wishNote}>
                    {item.wish.notes ?? item.confidenceReason}
                  </Text>
                  <Text style={styles.wishReason}>{item.confidenceReason}</Text>

                  <View style={styles.wishFooter}>
                    <Text style={styles.wishDate}>
                      {formatDateLabel(item.estimatedPurchaseDate)}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressValue,
                          { width: `${item.progressRatio * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}

            <View style={styles.tipCard}>
              <Text style={styles.tipEyebrow}>TIP DETERMINISTICO</Text>
              <Text style={styles.tipText}>{actionTip}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Liquidez</Text>
                <Text style={styles.metricValue}>
                  {currentScore?.breakdown.liquidity_score ?? 0}
                </Text>
                <Text style={styles.metricScale}>/100</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Compromisos</Text>
                <Text style={styles.metricValue}>
                  {currentScore?.breakdown.commitment_score ?? 0}
                </Text>
                <Text style={styles.metricScale}>/100</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Ahorro</Text>
                <Text style={styles.metricValue}>
                  {currentScore?.breakdown.savings_score ?? 0}
                </Text>
                <Text style={styles.metricScale}>/100</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Score total</Text>
                <Text style={styles.metricValue}>{currentScore?.score ?? 0}</Text>
                <Text style={styles.metricScale}>/100</Text>
              </View>
            </View>

            <View style={styles.daysCard}>
              <Text style={styles.daysLabel}>Tu margen actual cubre</Text>
              <Text style={styles.daysValue}>{coverageDays} dias</Text>
              <Text style={styles.daysMeta}>
                Reserva sugerida {formatMoney(currency, overview?.reserveAmount ?? 0)}
              </Text>
              <View style={styles.daysTrack}>
                <View
                  style={[
                    styles.daysTrackValue,
                    {
                      width: `${Math.max(
                        12,
                        Math.min(((currentScore?.score ?? 0) / 100) * 100, 100),
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Evolucion del score</Text>
              <Text style={styles.chartMeta}>Base semanal</Text>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartBars}>
                {scoreChart.map((bar) => (
                  <View key={bar.label} style={styles.chartBarGroup}>
                    <View style={[styles.chartBar, { height: Math.max(20, bar.value) }]} />
                    <Text style={styles.chartMonth}>{bar.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.reportCard}>
              <Text style={styles.sectionTitle}>Resumen deterministico</Text>
              <Text style={styles.reportText}>
                Balance total disponible:{" "}
                <Text style={styles.reportAccent}>
                  {formatMoney(currency, overview?.availableBalance ?? 0)}
                </Text>
                . Comprometido este mes:{" "}
                <Text style={styles.reportAccent}>
                  {formatMoney(currency, overview?.committedAmount ?? 0)}
                </Text>
                .
              </Text>
              <Text style={styles.reportText}>
                Ahorro mensual observado para metas:{" "}
                <Text style={styles.reportAccent}>
                  {formatMoney(
                    currency,
                    overview?.monthlyGoalContributionAverage ?? 0,
                  )}
                </Text>
                . Pendiente salarial:{" "}
                <Text style={styles.reportAccent}>
                  {formatMoney(currency, overview?.pendingSalaryAmount ?? 0)}
                </Text>
                .
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipEyebrow}>SIGUIENTE ACCION</Text>
              <Text style={styles.tipText}>{actionTip}</Text>
            </View>
          </>
        )}

        <Text style={styles.footerMeta}>
          Formato actual: {settings?.dateFormat ?? "DD/MM/YYYY"}
        </Text>
      </ScrollView>

      <PlanningSheetStack
        activeGoals={activeGoals}
        contributionDraft={contributionDraft}
        goalDraft={goalDraft}
        isSubmitting={isSubmitting}
        onClose={closeSheet}
        onSubmitContribution={() => {
          void handleCreateContribution();
        }}
        onSubmitGoal={() => {
          void handleCreateGoal();
        }}
        onSubmitWish={() => {
          void handleCreateWish();
        }}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1020",
  },
  border: {
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
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionPill: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#141D32",
    borderWidth: 1,
    borderColor: "rgba(69, 98, 255, 0.24)",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPillText: {
    color: "#D8E1F5",
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.88,
  },
  stateCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 18,
    gap: 10,
    alignItems: "center",
  },
  stateTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  stateText: {
    color: "#C0CADF",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  goalCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 10,
  },
  inlineAction: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(69, 98, 255, 0.16)",
  },
  inlineActionText: {
    color: "#D8E1F5",
    fontSize: 12,
    fontWeight: "800",
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  goalTitle: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  goalAmount: {
    color: "#4562FF",
    fontSize: 13,
    fontWeight: "800",
  },
  goalMeta: {
    color: "#B4C2DB",
    fontSize: 13,
    lineHeight: 18,
  },
  wishCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 8,
  },
  wishCardDimmed: {
    opacity: 0.55,
  },
  wishHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wishTitle: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  wishPrice: {
    color: "#4562FF",
    fontSize: 18,
    fontWeight: "800",
  },
  wishConfidence: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
  },
  wishConfidenceHigh: {
    color: "#34D399",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  wishConfidenceMedium: {
    color: "#FBBF24",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
  wishConfidenceLow: {
    color: "#60A5FA",
    backgroundColor: "rgba(96, 165, 250, 0.14)",
  },
  wishConfidenceRisky: {
    color: "#F87171",
    backgroundColor: "rgba(248, 113, 113, 0.14)",
  },
  wishNote: {
    color: "#C0CADF",
    fontSize: 14,
    lineHeight: 20,
  },
  wishReason: {
    color: "#8FA2C2",
    fontSize: 12,
    lineHeight: 18,
  },
  wishFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wishDate: {
    color: "#94A3B8",
    fontSize: 12,
    minWidth: 72,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    overflow: "hidden",
  },
  progressValue: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#4562FF",
  },
  tipCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(69, 98, 255, 0.28)",
    backgroundColor: "rgba(24, 34, 63, 0.85)",
    padding: 16,
    gap: 8,
  },
  tipEyebrow: {
    color: "#4562FF",
    fontSize: 12,
    fontWeight: "800",
  },
  tipText: {
    color: "#D4DEEF",
    fontSize: 14,
    lineHeight: 21,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 6,
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  metricScale: {
    color: "#94A3B8",
    fontSize: 12,
  },
  daysCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 8,
  },
  daysLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  daysValue: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  daysMeta: {
    color: "#C0CADF",
    fontSize: 14,
    lineHeight: 20,
  },
  daysTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    overflow: "hidden",
  },
  daysTrackValue: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#34D399",
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chartMeta: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  chartCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 150,
  },
  chartBarGroup: {
    alignItems: "center",
    gap: 8,
  },
  chartBar: {
    width: 16,
    borderRadius: 999,
    backgroundColor: "#4562FF",
  },
  chartMonth: {
    color: "#77829B",
    fontSize: 10,
    fontWeight: "700",
  },
  reportCard: {
    borderRadius: 16,
    backgroundColor: "#141D32",
    padding: 16,
    gap: 12,
  },
  reportText: {
    color: "#CDD7E8",
    fontSize: 14,
    lineHeight: 22,
  },
  reportAccent: {
    color: "#34D399",
    fontWeight: "800",
  },
  footerMeta: {
    color: "#77829B",
    fontSize: 12,
    textAlign: "center",
  },
});
