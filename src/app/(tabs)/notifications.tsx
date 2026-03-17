import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { FilterList } from "@/components/ui/filter-list";
import { ScreenHeader } from "@/components/ui/screen-header";
import { theme } from "@/utils/theme";

const filters = [
  { label: "Todos", value: "all" },
  { label: "Compromisos", value: "commitments" },
  { label: "Metas", value: "goals" },
  { label: "IA", value: "ai" },
] as const;

const items = [
  {
    body: "Tu suscripcion mensual de $12.99 sera procesada automaticamente desde tu cuenta principal.",
    group: "RECIENTES",
    icon: "calendar",
    time: "Hace 5 min",
    tone: "#F59E0B",
    title: "Netflix se cobrara en 2 dias",
    unread: true,
  },
  {
    body: "¡Felicidades! Has alcanzado la mitad de tu meta 'Viaje a Japon'. Vas por muy buen camino.",
    group: "RECIENTES",
    icon: "trophy",
    time: "Hace 2h",
    tone: "#20D396",
    title: "¡Meta alcanzada al 50%!",
    unread: true,
  },
  {
    body: "Podrias ahorrar $50 este mes si reduces tus gastos en Restaurantes un 15% segun tu historial.",
    group: "RECIENTES",
    icon: "sparkles",
    time: "Hace 5h",
    tone: "#4B69FF",
    title: "AI Tip: Ahorro potencial",
    unread: false,
  },
  {
    body: "Se detecto un acceso desde un dispositivo iPhone 15 en Madrid, Espana.",
    group: "ANTERIORES",
    icon: "shield",
    time: "Ayer",
    tone: "#8A96B3",
    title: "Nuevo inicio de sesion",
    unread: false,
  },
] as const;

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        secondaryAction={{ icon: "bell", showBadge: true }}
        title="Notificaciones"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FilterList
          onChange={() => undefined}
          options={filters.map((filter) => ({ ...filter }))}
          value="all"
        />

        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>RECIENTES</Text>
          <Text style={styles.groupAction}>MARCAR COMO LEIDAS</Text>
        </View>

        {items.map((item, index) => {
          const groupChanged = index > 0 && items[index - 1].group !== item.group;

          return (
            <View key={`${item.title}-${item.time}`}>
              {groupChanged ? (
                <Text style={[styles.groupTitle, styles.groupTitleSpaced]}>{item.group}</Text>
              ) : null}

              <View style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: `${item.tone}22` }]}>
                  {item.icon === "calendar" ? (
                    <MaterialCommunityIcons color={item.tone} name="calendar-refresh-outline" size={20} />
                  ) : null}
                  {item.icon === "trophy" ? (
                    <Ionicons color={item.tone} name="trophy-outline" size={18} />
                  ) : null}
                  {item.icon === "sparkles" ? (
                    <Ionicons color={item.tone} name="sparkles-outline" size={18} />
                  ) : null}
                  {item.icon === "shield" ? (
                    <Ionicons color={item.tone} name="shield-checkmark-outline" size={18} />
                  ) : null}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.timeWrap}>
                      <Text style={styles.timeText}>{item.time}</Text>
                      {item.unread ? <View style={styles.unreadDot} /> : null}
                    </View>
                  </View>
                  <Text style={styles.cardText}>{item.body}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginTop: 10,
  },
  groupTitle: {
    color: theme.colors.grayLight,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  groupTitleSpaced: { marginTop: 8 },
  groupAction: { color: theme.colors.primary, fontSize: 11, fontWeight: "700" },
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
  cardTitle: { flex: 1, color: theme.colors.white, fontSize: 16, fontWeight: "700" },
  timeWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { color: theme.colors.grayLight, fontSize: 11, fontWeight: "700" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  cardText: { color: theme.colors.grayLight, fontSize: 14, lineHeight: 21 },
});
