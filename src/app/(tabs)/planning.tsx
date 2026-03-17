import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import {
  PlanningSheetStack,
  type ContributionDraft,
  type GoalDraft,
  type PlanningSheetKind,
  type WishDraft,
} from '@/components/planning/planning-sheet-stack'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { DecorativeBackground } from '@/components/ui/decorative-background'
import { FilterList } from '@/components/ui/filter-list'
import { ScreenHeader } from '@/components/ui/screen-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { createRecurringExpense } from '@/modules/commitments/service'
import { createLocalRecurringExpense } from '@/modules/commitments/types'
import { addGoalContribution, createGoal } from '@/modules/goals/service'
import {
  createLocalGoal,
  createLocalGoalContribution,
} from '@/modules/goals/types'
import { createLocalLedgerEntry } from '@/modules/ledger/types'
import { createBudgetProvision } from '@/modules/provisions/service'
import { createLocalBudgetProvision } from '@/modules/provisions/types'
import { createWish } from '@/modules/wishes/service'
import { createLocalWish } from '@/modules/wishes/types'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCommitmentStore } from '@/stores/commitment-store'
import { useLedgerStore } from '@/stores/ledger-store'
import { usePlanningStore } from '@/stores/planning-store'
import { theme } from '@/utils/theme'

type PlanningView = 'desires' | 'commitments' | 'insights'
type DesireFilter = 'all' | 'bought' | 'pending'
type CommitmentDraft = {
  amount: string
  day: string
  kind: 'fixed' | 'event'
  month: string
  name: string
  notes: string
  walletId: string
}

function dateLabel(value: string | null, month = false) {
  if (!value) {
    return '--'
  }

  const [year, rawMonth, rawDay] = value.slice(0, 10).split('-')
  const monthIndex = Math.max(0, Number(rawMonth) - 1)
  const day = Number(rawDay || '1')
  const safeDate = new Date(Date.UTC(Number(year), monthIndex, day))

  return safeDate.toLocaleDateString('en-US', {
    day: month ? undefined : '2-digit',
    month: 'short',
    year: month ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}

function tip(args: {
  assignableAmount: number
  goalShortfall: number
  nextWishAmount: number | null
}) {
  if (args.assignableAmount > 0 && args.goalShortfall > 0) {
    return `Tienes margen para mover ${args.assignableAmount.toFixed(0)} a metas sin tocar tu reserva.`
  }

  if (
    args.nextWishAmount !== null &&
    args.assignableAmount >= args.nextWishAmount
  ) {
    return 'Tu primera prioridad ya cabe en el dinero asignable actual.'
  }

  return 'Conviene mantener el foco en ahorro estable antes de subir nuevas prioridades.'
}

export default function PlanningScreen() {
  const router = useRouter()
  const [view, setView] = useState<PlanningView>('desires')
  const [filter, setFilter] = useState<DesireFilter>('all')
  const [sheet, setSheet] = useState<PlanningSheetKind>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    deadline: '',
    name: '',
    targetAmount: '',
    walletId: '',
  })
  const [contributionDraft, setContributionDraft] = useState<ContributionDraft>(
    {
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      goalId: '',
      note: '',
    },
  )
  const [wishDraft, setWishDraft] = useState<WishDraft>({
    amount: '',
    name: '',
    notes: '',
    priority: '1',
    walletId: '',
  })
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commitmentDraft, setCommitmentDraft] = useState<CommitmentDraft>({
    amount: '',
    day: String(new Date().getUTCDate()).padStart(2, '0'),
    kind: 'fixed',
    month: new Date().toISOString().slice(0, 7),
    name: '',
    notes: '',
    walletId: '',
  })
  const [commitmentOpen, setCommitmentOpen] = useState(false)
  const [commitmentError, setCommitmentError] = useState<string | null>(null)
  const [isCommitmentSubmitting, setIsCommitmentSubmitting] = useState(false)

  const isDevBypass = useAuthStore((state) => state.isDevBypass)
  const user = useAuthStore((state) => state.user)
  const settings = useAppStore((state) => state.settings)
  const wallets = useAppStore((state) => state.wallets)
  const selectedWalletId = useAppStore((state) => state.selectedWalletId)
  const applyWalletBalanceDelta = useAppStore(
    (state) => state.applyWalletBalanceDelta,
  )
  const refreshAppData = useAppStore((state) => state.refreshAppData)
  const goalSnapshots = usePlanningStore((state) => state.goalSnapshots)
  const wishProjections = usePlanningStore((state) => state.wishProjections)
  const currentScore = usePlanningStore((state) => state.currentScore)
  const recentScores = usePlanningStore((state) => state.recentScores)
  const overview = usePlanningStore((state) => state.overview)
  const error = usePlanningStore((state) => state.error)
  const isLoading = usePlanningStore((state) => state.isLoading)
  const isReady = usePlanningStore((state) => state.isReady)
  const refreshPlanningData = usePlanningStore(
    (state) => state.refreshPlanningData,
  )
  const addLocalGoal = usePlanningStore((state) => state.addLocalGoal)
  const addLocalGoalContribution = usePlanningStore(
    (state) => state.addLocalGoalContribution,
  )
  const addLocalWish = usePlanningStore((state) => state.addLocalWish)
  const addLocalEntry = useLedgerStore((state) => state.addLocalEntry)
  const refreshLedger = useLedgerStore((state) => state.refreshLedger)
  const refreshCommitmentData = useCommitmentStore(
    (state) => state.refreshCommitmentData,
  )
  const recurringExpenses = useCommitmentStore(
    (state) => state.recurringExpenses,
  )
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions)
  const addLocalRecurringExpense = useCommitmentStore(
    (state) => state.addLocalRecurringExpense,
  )
  const addLocalBudgetProvision = useCommitmentStore(
    (state) => state.addLocalBudgetProvision,
  )
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`

  useEffect(() => {
    if (!user?.id || !settings) {
      return
    }

    void refreshPlanningData({
      isDevBypass,
      settings,
      userId: user.id,
      wallets,
    })
  }, [isDevBypass, refreshPlanningData, settings, user?.id, wallets])

  useEffect(() => {
    if (!user?.id || !selectedWalletId) {
      return
    }

    void refreshCommitmentData({
      isDevBypass,
      month: currentMonth,
      userId: user.id,
      walletId: selectedWalletId,
    })
  }, [
    currentMonth,
    isDevBypass,
    refreshCommitmentData,
    selectedWalletId,
    user?.id,
  ])

  const activeGoals = goalSnapshots.filter(
    (snapshot) =>
      snapshot.goal.status === 'active' || snapshot.status === 'at_risk',
  )
  const filteredWishes = useMemo(() => {
    if (filter === 'all') {
      return wishProjections
    }

    if (filter === 'bought') {
      return wishProjections.filter((item) => item.wish.isPurchased)
    }

    return wishProjections.filter((item) => !item.wish.isPurchased)
  }, [filter, wishProjections])
  const pendingGoalAmount = goalSnapshots.reduce(
    (total, snapshot) => total + snapshot.remainingAmount,
    0,
  )
  const nextWishAmount =
    wishProjections.find((projection) => !projection.wish.isPurchased)?.wish
      .estimatedAmount ?? null
  const coverageDays =
    overview?.monthlyCommitmentAverage && overview.monthlyCommitmentAverage > 0
      ? Math.max(
        0,
        Math.round(
          (Math.max(
            (overview.availableBalance ?? 0) -
            (overview.committedAmount ?? 0),
            0,
          ) /
            overview.monthlyCommitmentAverage) *
          30,
        ),
      )
      : 0
  const savingsRatio =
    overview?.monthlyIncome && overview.monthlyIncome > 0
      ? Math.round(
        ((overview.monthlyGoalContributionAverage ?? 0) /
          overview.monthlyIncome) *
        100,
      )
      : 0
  const actionTip = tip({
    assignableAmount: overview?.assignableAmount ?? 0,
    goalShortfall: pendingGoalAmount,
    nextWishAmount,
  })
  const scoreBars = (
    recentScores.slice(0, 6).reverse().length
      ? recentScores
        .slice(0, 6)
        .reverse()
        .map((item) => ({
          label: new Date(`${item.weekStart}T00:00:00.000Z`)
            .toLocaleDateString('en-US', { month: 'short' })
            .toUpperCase(),
          value: item.score,
        }))
      : [
        {
          label: 'ENE',
          value: currentScore?.breakdown.liquidity_score ?? 42,
        },
        {
          label: 'FEB',
          value: currentScore?.breakdown.commitment_score ?? 56,
        },
        { label: 'MAR', value: currentScore?.breakdown.savings_score ?? 48 },
        {
          label: 'ABR',
          value: currentScore?.breakdown.salary_stability_score ?? 62,
        },
        {
          label: 'MAY',
          value: currentScore?.breakdown.wishlist_pressure_score ?? 58,
        },
        { label: 'JUN', value: currentScore?.score ?? 64 },
      ]
  ) as { label: string; value: number }[]

  function closeSheet() {
    setSheet(null)
    setSheetError(null)
    setIsSubmitting(false)
  }

  function openGoalSheet() {
    setGoalDraft({
      deadline: '',
      name: '',
      targetAmount: '',
      walletId: wallets.find((wallet) => wallet.isActive)?.id ?? '',
    })
    setPickerOpen(false)
    setSheet('goal')
  }

  function openContributionSheet(goalId?: string) {
    setContributionDraft({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      goalId: goalId ?? activeGoals[0]?.goal.id ?? '',
      note: '',
    })
    setPickerOpen(false)
    setSheet('contribution')
  }

  function openWishSheet() {
    const maxPriority = wishProjections.reduce(
      (highest, projection) => Math.max(highest, projection.wish.priority),
      0,
    )

    setWishDraft({
      amount: '',
      name: '',
      notes: '',
      priority: String(maxPriority + 1 || 1),
      walletId: wallets.find((wallet) => wallet.isActive)?.id ?? '',
    })
    setPickerOpen(false)
    setSheet('wish')
  }

  function openCommitmentSheet() {
    setPickerOpen(false)
    setCommitmentError(null)
    setIsCommitmentSubmitting(false)
    setCommitmentDraft({
      amount: '',
      day: String(new Date().getUTCDate()).padStart(2, '0'),
      kind: 'fixed',
      month: new Date().toISOString().slice(0, 7),
      name: '',
      notes: '',
      walletId:
        selectedWalletId ?? wallets.find((wallet) => wallet.isActive)?.id ?? '',
    })
    setCommitmentOpen(true)
  }

  async function refreshAll() {
    if (!user?.id || !settings) {
      return
    }

    await refreshPlanningData({
      isDevBypass,
      settings,
      userId: user.id,
      wallets: useAppStore.getState().wallets,
    })
  }

  async function handleCreateGoal() {
    if (!user?.id) {
      setSheetError('No hay sesion activa.')
      return
    }

    const targetAmount = Number(goalDraft.targetAmount)
    if (!goalDraft.name.trim()) {
      setSheetError('Escribe un nombre para la meta.')
      return
    }
    if (
      Number.isNaN(targetAmount) ||
      targetAmount <= 0 ||
      !goalDraft.walletId
    ) {
      setSheetError('Completa nombre, monto y wallet.')
      return
    }

    setIsSubmitting(true)
    setSheetError(null)

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
        )
      } else {
        await createGoal({
          deadline: goalDraft.deadline || null,
          name: goalDraft.name,
          targetAmount,
          userId: user.id,
          walletId: goalDraft.walletId,
        })
      }

      await refreshAll()
      closeSheet()
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear la meta.',
      )
      setIsSubmitting(false)
    }
  }

  async function handleCreateContribution() {
    if (!user?.id) {
      setSheetError('No hay sesion activa.')
      return
    }

    const amount = Number(contributionDraft.amount)
    const selectedGoal = activeGoals.find(
      (snapshot) => snapshot.goal.id === contributionDraft.goalId,
    )?.goal

    if (!selectedGoal || Number.isNaN(amount) || amount <= 0) {
      setSheetError('Selecciona una meta valida y un monto mayor que cero.')
      return
    }

    setIsSubmitting(true)
    setSheetError(null)

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
        )
        addLocalEntry(
          createLocalLedgerEntry({
            amount: amount * -1,
            date: contributionDraft.date,
            description: contributionDraft.note || selectedGoal.name,
            type: 'goal_deposit',
            userId: user.id,
            walletId: selectedGoal.walletId,
          }),
        )
        applyWalletBalanceDelta({
          amount: amount * -1,
          walletId: selectedGoal.walletId,
        })
      } else {
        await addGoalContribution({
          amount,
          date: contributionDraft.date,
          goalId: selectedGoal.id,
          note: contributionDraft.note || null,
          walletId: selectedGoal.walletId,
        })
        await refreshAppData({ isDevBypass: false, userId: user.id })
        if (selectedWalletId) {
          await refreshLedger({
            isDevBypass: false,
            userId: user.id,
            walletId: selectedWalletId,
          })
        }
      }

      await refreshAll()
      closeSheet()
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo registrar el aporte.',
      )
      setIsSubmitting(false)
    }
  }

  async function handleCreateWish() {
    if (!user?.id) {
      setSheetError('No hay sesion activa.')
      return
    }

    const estimatedAmount = Number(wishDraft.amount)
    const priority = Number(wishDraft.priority)

    if (
      !wishDraft.name.trim() ||
      Number.isNaN(estimatedAmount) ||
      estimatedAmount <= 0 ||
      Number.isNaN(priority) ||
      priority <= 0 ||
      !wishDraft.walletId
    ) {
      setSheetError('Completa nombre, monto, prioridad y wallet.')
      return
    }

    setIsSubmitting(true)
    setSheetError(null)

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
        )
      } else {
        await createWish({
          estimatedAmount,
          name: wishDraft.name,
          notes: wishDraft.notes || null,
          priority,
          userId: user.id,
          walletId: wishDraft.walletId,
        })
      }

      await refreshAll()
      closeSheet()
    } catch (submitError) {
      setSheetError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el deseo.',
      )
      setIsSubmitting(false)
    }
  }

  async function handleCreateCommitment() {
    if (!user?.id) {
      setCommitmentError('No hay sesion activa.')
      return
    }

    const amount = Number(commitmentDraft.amount)
    const billingDay = Number(commitmentDraft.day)
    const targetMonth = `${commitmentDraft.month.slice(0, 7)}-01`

    if (
      !commitmentDraft.name.trim() ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      !commitmentDraft.walletId
    ) {
      setCommitmentError('Completa nombre, monto y wallet.')
      return
    }

    setIsCommitmentSubmitting(true)
    setCommitmentError(null)

    try {
      if (commitmentDraft.kind === 'fixed') {
        if (Number.isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
          setCommitmentError('El dia de cobro debe ser entre 1 y 31.')
          setIsCommitmentSubmitting(false)
          return
        }

        if (isDevBypass) {
          addLocalRecurringExpense(
            createLocalRecurringExpense({
              amount,
              billingDay,
              categoryId: null,
              frequency: 'monthly',
              name: commitmentDraft.name,
              notes: commitmentDraft.notes || null,
              type: 'fixed_expense',
              userId: user.id,
              walletId: commitmentDraft.walletId,
            }),
          )
        } else {
          await createRecurringExpense({
            amount,
            billingDay,
            categoryId: null,
            frequency: 'monthly',
            name: commitmentDraft.name,
            notes: commitmentDraft.notes || undefined,
            type: 'fixed_expense',
            walletId: commitmentDraft.walletId,
          })
        }
      } else {
        if (!/^\d{4}-\d{2}-01$/.test(targetMonth)) {
          setCommitmentError('El mes debe tener formato YYYY-MM.')
          setIsCommitmentSubmitting(false)
          return
        }

        if (isDevBypass) {
          addLocalBudgetProvision(
            createLocalBudgetProvision({
              amount,
              categoryId: null,
              month: targetMonth,
              name: commitmentDraft.name,
              notes: commitmentDraft.notes || null,
              recurrence: 'once',
              userId: user.id,
              walletId: commitmentDraft.walletId,
            }),
          )
        } else {
          await createBudgetProvision({
            amount,
            categoryId: null,
            month: targetMonth,
            name: commitmentDraft.name,
            notes: commitmentDraft.notes || undefined,
            recurrence: 'once',
            walletId: commitmentDraft.walletId,
          })
        }
      }

      await refreshCommitmentData({
        isDevBypass,
        month: currentMonth,
        userId: user.id,
        walletId: selectedWalletId ?? commitmentDraft.walletId,
      })
      setCommitmentOpen(false)
      setIsCommitmentSubmitting(false)
    } catch (submitError) {
      setCommitmentError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el compromiso.',
      )
      setIsCommitmentSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        primaryAction={{ icon: 'plus', onPress: () => setPickerOpen(true) }}
        secondaryAction={{
          icon: 'bell',
          onPress: () => router.push('/notifications'),
          showBadge: true,
        }}
        title="Planificacion"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          onChange={setView}
          options={[
            { label: 'Deseos', value: 'desires' },
            { label: 'Compromisos', value: 'commitments' },
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
        ) : view === 'desires' ? (
          <>
            <FilterList
              onChange={setFilter}
              options={[
                { label: 'Todos', value: 'all' },
                { label: 'Pendientes', value: 'pending' },
                { label: 'Comprados', value: 'bought' },
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
                  <Text
                    style={[
                      styles.cardTitle,
                      item.wish.isPurchased && styles.strike,
                    ]}
                  >
                    {item.wish.name}
                  </Text>
                  <Text style={styles.price}>
                    ${item.wish.estimatedAmount.toFixed(0)}
                  </Text>
                </View>
                <Text style={styles.pill}>
                  {item.wish.isPurchased
                    ? 'COMPRADO'
                    : item.confidenceLevel === 'high'
                      ? 'IA: Alta confianza'
                      : item.confidenceLevel === 'medium'
                        ? 'IA: Media'
                        : item.confidenceLevel === 'low'
                          ? 'IA: Baja'
                          : 'IA: Riesgo'}
                </Text>
                <Text style={styles.bodyText}>
                  {item.wish.notes ?? item.confidenceReason}
                </Text>
                <Text style={styles.softText}>
                  {item.wish.isPurchased
                    ? 'Presupuestado correctamente'
                    : `Requiere ${item.monthsUntilPurchase ?? 'mas'} ${item.monthsUntilPurchase === 1 ? 'mes' : 'meses'
                    } de ahorro`}
                </Text>
                <View style={styles.rowBetween}>
                  <View style={styles.inlineRow}>
                    <MaterialCommunityIcons
                      color="#7C89A8"
                      name="calendar-month-outline"
                      size={13}
                    />
                    <Text style={styles.softText}>
                      {item.wish.isPurchased
                        ? dateLabel(
                          item.wish.purchasedAt?.slice(0, 10) ?? null,
                          true,
                        )
                        : dateLabel(item.estimatedPurchaseDate)}
                    </Text>
                  </View>
                  {!item.wish.isPurchased ? (
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.trackFill,
                          {
                            width: `${Math.max(item.progressRatio * 100, 18)}%`,
                          },
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
        ) : view === 'commitments' ? (
          <>
            <Text style={styles.sectionTitle}>Fijos</Text>
            {recurringExpenses
              .filter(
                (item) => item.walletId === selectedWalletId && item.isActive,
              )
              .map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.price}>${item.amount.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.softText}>
                    {item.frequency === 'monthly'
                      ? `Mensual - dia ${String(item.billingDay).padStart(2, '0')}`
                      : `Anual - ${String(item.billingDay).padStart(2, '0')}/${String(
                        item.billingMonth ?? 1,
                      ).padStart(2, '0')}`}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.bodyText}>{item.notes}</Text>
                  ) : null}
                </View>
              ))}

            <Text style={styles.sectionTitle}>Eventos Especiales</Text>
            {budgetProvisions
              .filter(
                (item) => item.walletId === selectedWalletId && item.isActive,
              )
              .map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.price}>${item.amount.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.softText}>
                    {item.recurrence === 'yearly' ? 'Anual' : 'Una vez'} -{' '}
                    {dateLabel(item.month, true)}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.bodyText}>{item.notes}</Text>
                  ) : null}
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
                <MaterialCommunityIcons
                  color="#F59E0B"
                  name="briefcase-clock-outline"
                  size={14}
                />
                <Text style={styles.metricValue}>
                  {Math.max(
                    0,
                    100 - (currentScore?.breakdown.commitment_score ?? 0),
                  )}
                  %
                </Text>
                <Text style={styles.metricLabel}>COMPROMISOS</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons
                  color="#2AD596"
                  name="shield-checkmark-outline"
                  size={14}
                />
                <Text style={styles.metricValue}>
                  {(currentScore?.breakdown.salary_stability_score ?? 0) >= 70
                    ? 'Alta'
                    : 'Media'}
                </Text>
                <Text style={styles.metricLabel}>ESTABILIDAD</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons
                  color="#6C83FF"
                  name="trending-up-outline"
                  size={14}
                />
                <Text style={styles.metricValue}>
                  {Math.max(savingsRatio, 0)}%
                </Text>
                <Text style={styles.metricLabel}>RATIO AHORRO</Text>
              </View>
            </View>

            <View style={styles.cardWide}>
              <View>
                <Text style={styles.softText}>Tu dinero dura</Text>
                <Text style={styles.days}>{coverageDays} dias</Text>
              </View>
              <View style={styles.hourglass}>
                <MaterialCommunityIcons
                  color="#E1E7F8"
                  name="timer-sand"
                  size={18}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.softText}>Sin ingresos (Promedio)</Text>
              <Text style={styles.cardTitle}>
                {overview?.monthlyIncome
                  ? `${(
                    Math.max(
                      overview.availableBalance - overview.committedAmount,
                      0,
                    ) / overview.monthlyIncome
                  ).toFixed(1)} meses de vida`
                  : '0.0 meses de vida'}
              </Text>
              <View style={styles.trackLong}>
                <View
                  style={[
                    styles.trackFillGreen,
                    { width: `${Math.max(coverageDays * 1.8, 18)}%` },
                  ]}
                />
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
                      <View
                        style={[
                          styles.chartBar,
                          { height: Math.max(26, bar.value * 0.72) },
                        ]}
                      />
                      <View
                        style={[
                          styles.chartBar,
                          styles.chartBarMuted,
                          { height: Math.max(22, (bar.value - 10) * 0.7) },
                        ]}
                      />
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
                  : 'Tu estructura actual mantiene liquidez, pero todavia depende de convertir parte del dinero libre en ahorro sostenido.'}
              </Text>
              <Text style={styles.bodyText}>
                Si mantienes este ritmo, alcanzaras tu meta de fondo operativo
                en al menos {Math.max(coverageDays, 30)} dias.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons color="#6C83FF" name="sparkles-outline" size={18} />
              </View>
              <View style={styles.tipBody}>
                <Text style={styles.tipTitle}>TIP DE IA</Text>
                <Text style={styles.bodyText}>
                  Detectamos un excedente de $
                  {(overview?.assignableAmount ?? 0).toFixed(0)} en tu cuenta
                  corriente. Moverlo hoy a tu cuenta de ahorros generaria un
                  rendimiento extra solo en intereses.
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
          <Pressable
            onPress={openWishSheet}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#F59E0B" name="sparkles-outline" size={20} />
            <Text style={styles.sheetActionText}>Adicionar deseo</Text>
          </Pressable>
          <Pressable
            onPress={openCommitmentSheet}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#6C83FF" name="calendar-outline" size={20} />
            <Text style={styles.sheetActionText}>Adicionar compromiso</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet
        onClose={() => setCommitmentOpen(false)}
        visible={commitmentOpen}
      >
        <Text style={styles.sheetTitle}>Adicionar compromiso</Text>
        <Text style={styles.softText}>
          Puedes crear un fijo mensual o un evento especial futuro.
        </Text>

        <Text style={styles.label}>TIPO</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() =>
              setCommitmentDraft((current) => ({ ...current, kind: 'fixed' }))
            }
            style={[
              styles.chip,
              commitmentDraft.kind === 'fixed' && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                commitmentDraft.kind === 'fixed' && styles.chipTextActive,
              ]}
            >
              Fijo mensual
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setCommitmentDraft((current) => ({ ...current, kind: 'event' }))
            }
            style={[
              styles.chip,
              commitmentDraft.kind === 'event' && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                commitmentDraft.kind === 'event' && styles.chipTextActive,
              ]}
            >
              Evento
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>NOMBRE</Text>
        <TextInput
          onChangeText={(value) =>
            setCommitmentDraft((current) => ({ ...current, name: value }))
          }
          placeholder="Ej: Renta casa"
          placeholderTextColor="#7C89A8"
          style={styles.input}
          value={commitmentDraft.name}
        />

        <Text style={styles.label}>MONTO</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            setCommitmentDraft((current) => ({ ...current, amount: value }))
          }
          placeholder="120"
          placeholderTextColor="#7C89A8"
          style={styles.input}
          value={commitmentDraft.amount}
        />

        <Text style={styles.label}>WALLET</Text>
        <View style={styles.chipRow}>
          {wallets
            .filter((wallet) => wallet.isActive)
            .map((wallet) => (
              <Pressable
                key={wallet.id}
                onPress={() =>
                  setCommitmentDraft((current) => ({
                    ...current,
                    walletId: wallet.id,
                  }))
                }
                style={[
                  styles.chip,
                  commitmentDraft.walletId === wallet.id && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    commitmentDraft.walletId === wallet.id &&
                    styles.chipTextActive,
                  ]}
                >
                  {wallet.name}
                </Text>
              </Pressable>
            ))}
        </View>

        {commitmentDraft.kind === 'fixed' ? (
          <>
            <Text style={styles.label}>DIA DE COBRO (1-31)</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) =>
                setCommitmentDraft((current) => ({ ...current, day: value }))
              }
              placeholder="08"
              placeholderTextColor="#7C89A8"
              style={styles.input}
              value={commitmentDraft.day}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>MES (YYYY-MM)</Text>
            <TextInput
              onChangeText={(value) =>
                setCommitmentDraft((current) => ({ ...current, month: value }))
              }
              placeholder="2026-08"
              placeholderTextColor="#7C89A8"
              style={styles.input}
              value={commitmentDraft.month}
            />
          </>
        )}

        <Text style={styles.label}>NOTA</Text>
        <TextInput
          multiline
          onChangeText={(value) =>
            setCommitmentDraft((current) => ({ ...current, notes: value }))
          }
          placeholder="Opcional"
          placeholderTextColor="#7C89A8"
          style={[styles.input, styles.textArea]}
          value={commitmentDraft.notes}
        />

        {commitmentError ? (
          <Text style={styles.errorText}>{commitmentError}</Text>
        ) : null}

        <Pressable
          disabled={isCommitmentSubmitting}
          onPress={() => void handleCreateCommitment()}
          style={({ pressed }) => [
            styles.submitAction,
            pressed && !isCommitmentSubmitting && styles.pressed,
            isCommitmentSubmitting && styles.submitActionDisabled,
          ]}
        >
          {isCommitmentSubmitting ? (
            <ActivityIndicator color="#09111E" />
          ) : (
            <Text style={styles.submitActionText}>Guardar compromiso</Text>
          )}
        </Pressable>
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
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  sectionTitle: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  card: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  cardCenter: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardDim: { opacity: 0.52 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTitle: { color: theme.colors.white, fontSize: 15, fontWeight: '700', flex: 1 },
  strike: { textDecorationLine: 'line-through' },
  price: { color: theme.colors.primary, fontSize: 15, fontWeight: '700' },
  pill: { color: theme.colors.green, fontSize: 10, fontWeight: '700' },
  bodyText: { color: theme.colors.grayLight, fontSize: 13, lineHeight: 19 },
  softText: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  tipCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.blueSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blueSoft,
  },
  tipBody: { flex: 1, gap: 6 },
  tipTitle: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  label: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.blueSoft,
  },
  chipText: { color: theme.colors.grayLight, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: theme.colors.white },
  input: {
    minHeight: 42,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  errorText: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginTop: 10 },
  submitAction: {
    minHeight: 50,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginTop: 16,
  },
  submitActionDisabled: { opacity: 0.75 },
  submitActionText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  track: {
    width: 72,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.grayLight,
    overflow: 'hidden',
  },
  trackLong: {
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: 'rgba(92, 103, 135, 0.34)',
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary },
  trackFillGreen: {
    height: '100%',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.green,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    minWidth: 148,
    flexGrow: 1,
    flexBasis: 148,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 8,
  },
  metricValue: { color: theme.colors.white, fontSize: 28, fontWeight: '700' },
  metricScale: { color: theme.colors.grayLight, fontSize: 11, fontWeight: '700' },
  metricLabel: { color: theme.colors.grayLight, fontSize: 11, fontWeight: '700' },
  days: { color: theme.colors.white, fontSize: 36, fontWeight: '700' },
  hourglass: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blueSoft,
  },
  linkText: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  chart: {
    minHeight: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  chartGroup: { flex: 1, alignItems: 'center', gap: 8 },
  chartCols: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  chartBar: { width: 6, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary },
  chartBarMuted: { backgroundColor: theme.colors.grayLight },
  chartLabel: { color: theme.colors.grayLight, fontSize: 10, fontWeight: '700' },
  sheetTitle: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  sheetAction: {
    width: '48%',
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  sheetActionText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: { opacity: 0.88 },
})
