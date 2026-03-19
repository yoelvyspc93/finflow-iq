import { FlatList, StyleSheet, Text, View } from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { FilterList } from "@/components/ui/filter-list";
import type { WishProjection } from "@/modules/wishes/calculations";
import { theme } from "@/utils/theme";

export type WishFilterMode = "all" | "bought" | "pending";

type WishProjectionListProps = {
  actionTip: string;
  filter: WishFilterMode;
  items: WishProjection[];
  onFilterChange: (value: string) => void;
};

function dateLabel(value: string | null, month = false) {
  if (!value) {
    return "--";
  }

  const [year, rawMonth, rawDay] = value.slice(0, 10).split("-");
  const monthIndex = Math.max(0, Number(rawMonth) - 1);
  const day = Number(rawDay || "1");
  const safeDate = new Date(Date.UTC(Number(year), monthIndex, day));

  return safeDate.toLocaleDateString("es-ES", {
    day: month ? undefined : "2-digit",
    month: "short",
    year: month ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function WishProjectionList({
  actionTip,
  filter,
  items,
  onFilterChange,
}: WishProjectionListProps) {
  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.wish.id}
      ListEmptyComponent={
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sin deseos</Text>
          <Text style={styles.softText}>
            Crea tu primera prioridad para activar las proyecciones.
          </Text>
        </View>
      }
      ListFooterComponent={
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons color="#6C83FF" name="bulb-outline" size={18} />
          </View>
          <View style={styles.tipBody}>
            <Text style={styles.tipTitle}>SUGERENCIA</Text>
            <Text style={styles.bodyText}>{actionTip}</Text>
          </View>
        </View>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <FilterList
            onChange={onFilterChange}
            options={[
              { label: "Todos", value: "all" },
              { label: "Por comprar", value: "pending" },
              { label: "Comprados", value: "bought" },
            ]}
            value={filter}
          />
          <Text style={styles.sectionTitle}>Prioridades</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, item.wish.isPurchased && styles.cardDim]}>
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
                  ? "Listo para priorizar"
                  : item.confidenceLevel === "medium"
                    ? "Avance estable"
                    : item.confidenceLevel === "low"
                      ? "Conviene esperar"
                      : "Revisar antes de comprar"}
          </Text>
          <Text style={styles.bodyText}>{item.wish.notes ?? item.confidenceReason}</Text>
          <Text style={styles.softText}>
            {item.wish.isPurchased
              ? "Compra registrada"
              : `Necesita ${item.monthsUntilPurchase ?? "más"} ${
                  item.monthsUntilPurchase === 1 ? "mes" : "meses"
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
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  header: { gap: theme.spacing.md },
  sectionTitle: { color: theme.colors.white, fontSize: 16, fontWeight: "800" },
  card: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  cardDim: { opacity: 0.7 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: { flex: 1, color: theme.colors.white, fontSize: 16, fontWeight: "800" },
  strike: { textDecorationLine: "line-through" },
  price: { color: theme.colors.white, fontSize: 16, fontWeight: "800" },
  pill: { color: theme.colors.primary, fontSize: 11, fontWeight: "800" },
  bodyText: { color: theme.colors.white, fontSize: 13, lineHeight: 20 },
  softText: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  track: {
    width: 84,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: "rgba(92, 103, 135, 0.34)",
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
  },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.blueSoft,
  },
  tipBody: { flex: 1, gap: 6 },
  tipTitle: { color: theme.colors.primary, fontSize: 11, fontWeight: "800" },
});
