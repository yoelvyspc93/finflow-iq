import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Feather } from "@expo/vector-icons";

import { AppSwitch } from "@/components/ui/app-switch";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { Category } from "@/modules/categories/types";
import type { IncomeSource } from "@/modules/income-sources/types";
import type { Wallet } from "@/modules/wallets/types";
import { theme } from "@/utils/theme";

export type FinancesFormSheetMode =
  | "expense"
  | "income"
  | "transfer"
  | "salary-period"
  | "salary-payment"
  | null;

export type FinancesDraft = {
  amount: string;
  categoryId: string | null;
  date: string;
  description: string;
  destinationAmount: string;
  destinationWalletId: string | null;
  incomeSourceId: string | null;
  rate: string;
  wish: boolean;
};

type FinancesFormSheetProps = {
  activeWalletCurrency: string | null | undefined;
  activeWalletName: string | undefined;
  categories: Category[];
  draft: FinancesDraft;
  error: string | null;
  incomeSources: IncomeSource[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  setDraft: React.Dispatch<React.SetStateAction<FinancesDraft>>;
  sheet: FinancesFormSheetMode;
  submitLabel: string;
  title: string;
  wallets: Wallet[];
  selectedWalletId: string | null;
};

export function FinancesFormSheet({
  activeWalletCurrency,
  activeWalletName,
  categories,
  draft,
  error,
  incomeSources,
  isSubmitting,
  onClose,
  onSubmit,
  setDraft,
  sheet,
  submitLabel,
  title,
  wallets,
  selectedWalletId,
}: FinancesFormSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={sheet !== null}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <Pressable onPress={onClose}>
          <Feather color="#8A96B3" name="x" size={20} />
        </Pressable>
      </View>
      <Text style={styles.label}>
        {sheet === "salary-period" ? "MONTO NOMINA" : "MONTO"}
      </Text>
      <View style={styles.amountBox}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, amount: value }))
          }
          style={styles.amountInput}
          value={draft.amount}
        />
      </View>
      <View style={styles.cols}>
        <View style={styles.col}>
          <Text style={styles.label}>BILLETERA</Text>
          <View style={styles.field}>
            <Text style={styles.fieldText}>{activeWalletName ?? "Efectivo"}</Text>
          </View>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>
            {sheet === "salary-period" ? "PERÍODO (AAAA-MM)" : "FECHA"}
          </Text>
          <View style={styles.field}>
            <TextInput
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, date: value }))
              }
              style={styles.fieldInput}
              value={sheet === "salary-period" ? draft.date.slice(0, 7) : draft.date}
            />
          </View>
        </View>
      </View>
      {sheet === "expense" ? (
        <>
          <Text style={styles.label}>CATEGORIA</Text>
          <View style={styles.chips}>
            {categories.slice(0, 4).map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  setDraft((current) => ({ ...current, categoryId: item.id }))
                }
                style={[
                  styles.chip,
                  draft.categoryId === item.id && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    draft.categoryId === item.id && styles.chipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {sheet === "income" ? (
        <>
          <Text style={styles.label}>FUENTE</Text>
          <View style={styles.chips}>
            {incomeSources.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    incomeSourceId: item.id,
                  }))
                }
                style={[
                  styles.chip,
                  draft.incomeSourceId === item.id && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    draft.incomeSourceId === item.id && styles.chipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {sheet === "transfer" ? (
        <>
          <Text style={styles.label}>DESTINO</Text>
          <View style={styles.chips}>
            {wallets
              .filter(
                (item) =>
                  item.id !== selectedWalletId &&
                  item.isActive &&
                  item.currency !== activeWalletCurrency,
              )
              .map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      destinationWalletId: item.id,
                    }))
                  }
                  style={[
                    styles.chip,
                    draft.destinationWalletId === item.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draft.destinationWalletId === item.id && styles.chipTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              ))}
          </View>
          <View style={styles.cols}>
            <View style={styles.col}>
              <Text style={styles.label}>MONTO DESTINO</Text>
              <View style={styles.field}>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    setDraft((current) => ({
                      ...current,
                      destinationAmount: value,
                    }))
                  }
                  style={styles.fieldInput}
                  value={draft.destinationAmount}
                />
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>TASA</Text>
              <View style={styles.field}>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    setDraft((current) => ({ ...current, rate: value }))
                  }
                  style={styles.fieldInput}
                  value={draft.rate}
                />
              </View>
            </View>
          </View>
        </>
      ) : null}
      <Text style={styles.label}>DESCRIPCION</Text>
      <TextInput
        multiline
        onChangeText={(value) =>
          setDraft((current) => ({ ...current, description: value }))
        }
        placeholder="Descripción"
        placeholderTextColor="#57627F"
        style={styles.area}
        value={draft.description}
      />
      {sheet === "expense" ? (
        <View style={styles.toggle}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Es un deseo de tu wishlist?</Text>
            <Text style={styles.soft}>Marcar como gasto no esencial</Text>
          </View>
          <AppSwitch
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, wish: value }))
            }
            value={draft.wish}
          />
        </View>
      ) : null}
      {sheet === "salary-payment" ? (
        <Text style={styles.soft}>
          Se asignara automaticamente a los periodos pendientes visibles.
        </Text>
      ) : null}
      {sheet === "salary-period" ? (
        <Text style={styles.soft}>
          Crea un período de nómina para que los cobros de salario se asignen
          automaticamente.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: { color: theme.colors.white, fontSize: 24, fontWeight: "700" },
  label: {
    color: theme.colors.grayLight,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: "rgba(39, 46, 82, 0.38)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  currency: { color: theme.colors.primary, fontSize: 28, fontWeight: "700" },
  amountInput: { flex: 1, color: theme.colors.white, fontSize: 28, fontWeight: "700" },
  cols: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  field: {
    minHeight: 42,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  fieldText: { color: theme.colors.white, fontSize: 14, fontWeight: "600" },
  fieldInput: { color: theme.colors.white, fontSize: 14, paddingVertical: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minWidth: 74,
    minHeight: 40,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.blueSoft,
  },
  chipText: { color: theme.colors.grayLight, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: theme.colors.white },
  area: {
    minHeight: 88,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    textAlignVertical: "top",
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  toggleText: { flex: 1, gap: 3 },
  toggleTitle: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  soft: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  error: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginTop: 12 },
  button: {
    minHeight: 52,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    marginTop: 18,
  },
  buttonText: { color: theme.colors.white, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.88 },
});
