import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { FilterList } from "@/components/ui/filter-list";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCommitmentStore } from "@/stores/commitment-store";
import { usePlanningStore } from "@/stores/planning-store";
import { theme } from "@/utils/theme";

type NotificationFilter = "all" | "commitments" | "security" | "financial";
type NotificationIcon = "calendar" | "shield" | "pulse";
type NotificationKind = "commitments" | "security" | "financial";

type NotificationItem = {
  body: string;
  date: string;
  icon: NotificationIcon;
  id: string;
  kind: NotificationKind;
  targetRoute: Href;
  title: string;
  tone: string;
};

const filters: { label: string; value: NotificationFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Finanzas", value: "financial" },
  { label: "Compromisos", value: "commitments" },
  { label: "Seguridad", value: "security" },
];

function buildCommitmentDate(args: { day: number; month: number }) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), args.month - 1, args.day));
}

function formatRelativeDate(value: string) {
  const target = new Date(value);
  const now = new Date();
  const deltaMs = target.getTime() - now.getTime();
  const absMs = Math.abs(deltaMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < hour) {
    const minutes = Math.max(1, Math.round(absMs / minute));
    return deltaMs >= 0 ? `En ${minutes} min` : `Hace ${minutes} min`;
  }

  if (absMs < day) {
    const hours = Math.max(1, Math.round(absMs / hour));
    return deltaMs >= 0 ? `En ${hours} h` : `Hace ${hours} h`;
  }

  const days = Math.max(1, Math.round(absMs / day));
  return deltaMs >= 0 ? `En ${days} días` : `Hace ${days} días`;
}

function formatCommitmentDue(value: string) {
  const target = new Date(value);
  const now = new Date();
  const targetDay = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  );
  const nowDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dayDiff = Math.round((targetDay - nowDay) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) {
    return "Vence hoy";
  }

  if (dayDiff === 1) {
    return "Vence mañana";
  }

  if (dayDiff > 1 && dayDiff <= 7) {
    return `Vence en ${dayDiff} días`;
  }

  if (dayDiff < 0) {
    return `Vencio hace ${Math.abs(dayDiff)} días`;
  }

  return `Vence el ${target.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })}`;
}

function resolveGroup(value: string) {
  const target = new Date(value);
  const now = new Date();
  const absDays = Math.abs(target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  return absDays <= 7 ? "RECIENTES" : "ANTERIORES";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const user = useAuthStore((state) => state.user);
  const wallets = useAppStore((state) => state.wallets);
  const settings = useAppStore((state) => state.settings);
  const recurringExpenses = useCommitmentStore((state) => state.recurringExpenses);
  const budgetProvisions = useCommitmentStore((state) => state.budgetProvisions);
  const isLoading = useCommitmentStore((state) => state.isLoading);
  const refreshCommitmentData = useCommitmentStore((state) => state.refreshCommitmentData);
  const dashboardHealth = usePlanningStore((state) => state.dashboardHealth);
  const refreshPlanningData = usePlanningStore((state) => state.refreshPlanningData);

  const activeWalletIds = useMemo(
    () => new Set(wallets.filter((wallet) => wallet.isActive).map((wallet) => wallet.id)),
    [wallets],
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const month = `${new Date().toISOString().slice(0, 7)}-01`;
    void Promise.all([
      refreshCommitmentData({
        month,
        userId: user.id,
        walletId: null,
      }),
      settings
        ? refreshPlanningData({
            settings,
            userId: user.id,
            wallets,
          })
        : Promise.resolve(),
    ]);
  }, [refreshCommitmentData, refreshPlanningData, settings, user?.id, wallets]);

  const items = useMemo<NotificationItem[]>(() => {
    const currentMonth = new Date().getUTCMonth() + 1;
    const currentMonthToken = new Date().toISOString().slice(0, 7);

    const commitmentItems: NotificationItem[] = recurringExpenses
      .filter((expense) => {
        if (!expense.isActive || !activeWalletIds.has(expense.walletId)) {
          return false;
        }

        if (expense.frequency === "monthly") {
          return true;
        }

        return expense.frequency === "yearly" && expense.billingMonth === currentMonth;
      })
      .map((expense) => {
        const eventDate = buildCommitmentDate({
          day: expense.billingDay,
          month: expense.frequency === "yearly" ? (expense.billingMonth ?? currentMonth) : currentMonth,
        });

        return {
          body: `Se cargara ${expense.name} por $${expense.amount.toFixed(2)}.`,
          date: eventDate.toISOString(),
          icon: "calendar",
          id: `recurring-${expense.id}`,
          kind: "commitments",
          targetRoute: { params: { view: "commitments" }, pathname: "/planning" },
          title: `${expense.name} vence el dia ${String(expense.billingDay).padStart(2, "0")}`,
          tone: "#F59E0B",
        };
      });

    const provisionItems: NotificationItem[] = budgetProvisions
      .filter((provision) => {
        if (!provision.isActive || !activeWalletIds.has(provision.walletId)) {
          return false;
        }

        return provision.month.slice(0, 7) === currentMonthToken;
      })
      .map((provision) => ({
        body: `Provision del mes por $${provision.amount.toFixed(2)}.`,
        date: `${provision.month.slice(0, 10)}T00:00:00.000Z`,
        icon: "calendar",
        id: `provision-${provision.id}`,
        kind: "commitments",
        targetRoute: { params: { view: "commitments" }, pathname: "/planning" },
        title: provision.name,
        tone: "#4B69FF",
      }));

    const financialItems: NotificationItem[] = (dashboardHealth?.alerts ?? []).map((alert) => ({
      body: alert.body,
      date: new Date().toISOString(),
      icon: "pulse",
      id: `financial-${alert.id}`,
      kind: "financial",
      targetRoute: alert.route,
      title: alert.title,
      tone:
        alert.severity === "high"
          ? "#FF6B6D"
          : alert.severity === "medium"
            ? "#F59E0B"
            : "#4B69FF",
    }));

    const securityItems: NotificationItem[] = user?.last_sign_in_at
      ? [
        {
          body: "Revisa tu verificación en dos pasos y tus sesiones activas.",
          date: user.last_sign_in_at,
          icon: "shield",
          id: "security-last-sign-in",
          kind: "security",
          targetRoute: "/settings/security",
          title: "Último inicio de sesión detectado",
          tone: "#8A96B3",
        },
      ]
      : [];

    return [...financialItems, ...commitmentItems, ...provisionItems, ...securityItems].sort((left, right) =>
      right.date.localeCompare(left.date),
    );
  }, [activeWalletIds, budgetProvisions, dashboardHealth?.alerts, recurringExpenses, user?.last_sign_in_at]);

  const filteredItems = useMemo(
    () => items.filter((item) => filter === "all" || item.kind === filter),
    [filter, items],
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {
      ANTERIORES: [],
      RECIENTES: [],
    };

    for (const item of filteredItems) {
      groups[resolveGroup(item.date)].push(item);
    }

    return [
      { items: groups.RECIENTES, label: "RECIENTES" as const },
      { items: groups.ANTERIORES, label: "ANTERIORES" as const },
    ].filter((group) => group.items.length > 0);
  }, [filteredItems]);

  const emptyMessage =
    filter === "security"
      ? "No hay eventos de seguridad recientes."
      : filter === "financial"
        ? "No hay alertas financieras activas."
      : filter === "commitments"
        ? "No hay compromisos programados para este mes."
        : "No hay notificaciones disponibles en este momento.";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        secondaryAction={{ icon: "bell", showBadge: true }}
        title="Notificaciones"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FilterList
          onChange={setFilter}
          options={filters}
          value={filter}
        />

        {isLoading && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Cargando notificaciones...</Text>
          </View>
        ) : groupedItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          groupedItems.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              {group.items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(item.targetRoute)}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${item.tone}22` }]}>
                    {item.icon === "calendar" ? (
                      <MaterialCommunityIcons color={item.tone} name="calendar-refresh-outline" size={20} />
                    ) : item.icon === "pulse" ? (
                      <Ionicons color={item.tone} name="pulse-outline" size={18} />
                    ) : (
                      <Ionicons color={item.tone} name="shield-checkmark-outline" size={18} />
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.timeText}>
                        {item.kind === "commitments"
                          ? formatCommitmentDue(item.date)
                          : formatRelativeDate(item.date)}
                      </Text>
                    </View>
                    <Text style={styles.cardText}>{item.body}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  group: { gap: theme.spacing.sm, marginTop: 4 },
  groupTitle: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xs,
  },
  cardBody: { flex: 1, gap: 6 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { flex: 1, color: theme.colors.white, fontSize: 15, fontWeight: "700" },
  timeText: { color: theme.colors.grayLight, fontSize: 11, fontWeight: "700" },
  cardText: { color: theme.colors.grayLight, fontSize: 14, lineHeight: 21 },
  emptyCard: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: 6,
  },
  emptyTitle: { color: theme.colors.white, fontSize: 15, fontWeight: "700" },
  emptyText: { color: theme.colors.grayLight, fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.88 },
});
