import { SectionList, StyleSheet, Text, View } from "react-native";

import type { RecurringExpense } from "@/modules/commitments/types";
import type { BudgetProvision } from "@/modules/provisions/types";
import { theme } from "@/utils/theme";

type CommitmentSectionListProps = {
  budgetProvisions: BudgetProvision[];
  recurringExpenses: RecurringExpense[];
  selectedWalletId: string | null;
};

type CommitmentItem =
  | { kind: "recurring"; value: RecurringExpense }
  | { kind: "budget"; value: BudgetProvision };

type CommitmentSection = {
  data: CommitmentItem[];
  title: string;
};

function dateLabel(value: string | null, month = false) {
  if (!value) {
    return "--";
  }

  const [year, rawMonth, rawDay] = value.slice(0, 10).split("-");
  const monthIndex = Math.max(0, Number(rawMonth) - 1);
  const day = Number(rawDay || "1");
  const safeDate = new Date(Date.UTC(Number(year), monthIndex, day));

  return safeDate.toLocaleDateString("en-US", {
    day: month ? undefined : "2-digit",
    month: "short",
    year: month ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

function buildSections(
  recurringExpenses: RecurringExpense[],
  budgetProvisions: BudgetProvision[],
  selectedWalletId: string | null,
): CommitmentSection[] {
  const recurring = recurringExpenses
    .filter((item) => item.walletId === selectedWalletId && item.isActive)
    .map<CommitmentItem>((value) => ({ kind: "recurring", value }));
  const budget = budgetProvisions
    .filter((item) => item.walletId === selectedWalletId && item.isActive)
    .map<CommitmentItem>((value) => ({ kind: "budget", value }));

  return [
    { data: recurring, title: "Fijos" },
    { data: budget, title: "Eventos Especiales" },
  ];
}

export function CommitmentSectionList({
  budgetProvisions,
  recurringExpenses,
  selectedWalletId,
}: CommitmentSectionListProps) {
  const sections = buildSections(recurringExpenses, budgetProvisions, selectedWalletId);

  return (
    <SectionList
      contentContainerStyle={styles.content}
      keyExtractor={(item) => item.value.id}
      ListEmptyComponent={
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sin compromisos activos</Text>
          <Text style={styles.softText}>
            Agrega gastos fijos o eventos para planificar salidas futuras.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{item.value.name}</Text>
            <Text style={styles.price}>${item.value.amount.toFixed(2)}</Text>
          </View>
          <Text style={styles.softText}>
            {item.kind === "recurring"
              ? item.value.frequency === "monthly"
                ? `Mensual - dia ${String(item.value.billingDay).padStart(2, "0")}`
                : `Anual - ${String(item.value.billingDay).padStart(2, "0")}/${String(
                    item.value.billingMonth ?? 1,
                  ).padStart(2, "0")}`
              : `${item.value.recurrence === "yearly" ? "Anual" : "Una vez"} - ${dateLabel(
                  item.value.month,
                  true,
                )}`}
          </Text>
          {item.value.notes ? <Text style={styles.bodyText}>{item.value.notes}</Text> : null}
        </View>
      )}
      renderSectionHeader={({ section }) =>
        section.data.length > 0 ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        ) : null
      }
      sections={sections}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
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
  sectionHeader: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  sectionTitle: { color: theme.colors.white, fontSize: 16, fontWeight: "800" },
  card: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: { flex: 1, color: theme.colors.white, fontSize: 15, fontWeight: "800" },
  price: { color: theme.colors.white, fontSize: 15, fontWeight: "800" },
  softText: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  bodyText: { color: theme.colors.white, fontSize: 13, lineHeight: 20 },
});
