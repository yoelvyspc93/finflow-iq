import { FlatList, StyleSheet, Text, View } from "react-native";

import type { SalaryPeriod } from "@/modules/salary/types";
import { theme } from "@/utils/theme";

type SalaryHistoryListProps = {
  pendingMonths: number;
  pendingSalary: number;
  periods: SalaryPeriod[];
};

function periodLabel(value: string) {
  const [year, rawMonth, rawDay] = value.slice(0, 10).split("-");
  const monthIndex = Math.max(0, Number(rawMonth) - 1);
  const day = Number(rawDay || "1");
  const safeDate = new Date(Date.UTC(Number(year), monthIndex, day));

  return safeDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function SalaryHistoryList({
  pendingMonths,
  pendingSalary,
  periods,
}: SalaryHistoryListProps) {
  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={periods}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.sectionTitle}>Sin historial de nomina</Text>
          <Text style={styles.softText}>
            Registra un periodo o un pago para construir el historial salarial.
          </Text>
        </View>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>PENDIENTE</Text>
              <Text style={styles.statValue}>${pendingSalary.toFixed(2)}</Text>
              <Text style={styles.statMeta}>Saldo aun no cubierto</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>SIN PAGAR</Text>
              <Text style={styles.statValue}>{pendingMonths} meses</Text>
              <Text style={styles.statMeta}>Periodos abiertos</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Historial de nomina</Text>
        </View>
      }
      renderItem={({ item: period }) => (
        <View style={styles.salaryCard}>
          <View
            style={[
              styles.iconBox,
              period.status === "covered"
                ? styles.iconGreen
                : period.status === "partial"
                  ? styles.iconOrange
                  : styles.iconRed,
            ]}
          />
          <View style={styles.cardFlex}>
            <View style={styles.rowBetween}>
              <Text style={styles.listTitle}>{periodLabel(period.periodMonth)}</Text>
              <Text style={styles.pill}>{period.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.listMeta}>
              ${period.coveredAmount.toFixed(2)} / ${period.expectedAmount.toFixed(2)}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(
                      (period.coveredAmount / Math.max(period.expectedAmount, 1)) * 100,
                      12,
                    )}%`,
                  },
                ]}
              />
            </View>
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
  statRow: { flexDirection: "row", gap: theme.spacing.md },
  statCard: {
    flex: 1,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 6,
  },
  statLabel: { color: theme.colors.grayLight, fontSize: 11, fontWeight: "800" },
  statValue: { color: theme.colors.white, fontSize: 24, fontWeight: "800" },
  statMeta: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: theme.colors.white, fontSize: 16, fontWeight: "800" },
  salaryCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  iconBox: {
    width: 14,
    borderRadius: theme.radii.pill,
    alignSelf: "stretch",
  },
  iconGreen: { backgroundColor: theme.colors.green },
  iconOrange: { backgroundColor: theme.colors.yellowSoft },
  iconRed: { backgroundColor: theme.colors.red },
  cardFlex: { flex: 1, gap: 8 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listTitle: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  pill: { color: theme.colors.primary, fontSize: 11, fontWeight: "800" },
  listMeta: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  track: {
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: "rgba(92, 103, 135, 0.34)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary },
  emptyCard: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: 8,
  },
  softText: { color: theme.colors.grayLight, fontSize: 13, lineHeight: 20 },
});
