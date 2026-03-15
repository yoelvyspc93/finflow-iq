import type { Dispatch, SetStateAction } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { Category } from "@/modules/categories/types";
import type { IncomeSource } from "@/modules/income-sources/types";
import type {
  AiAnalysisFrequency,
  AppSettings,
  DateFormat,
  PrimaryCurrency,
} from "@/modules/settings/types";
import type { Wallet } from "@/modules/wallets/types";

export type SettingsSheetKind = "preferences" | "wallet" | "libraries" | null;

export type SettingsDraft = {
  aiAnalysisFrequency: AiAnalysisFrequency;
  avgMonthsWithoutPayment: string;
  dateFormat: DateFormat;
  financialMonthStartDay: string;
  primaryCurrency: PrimaryCurrency;
  savingsGoalPercent: string;
};

export type WalletDraft = {
  color: string;
  currency: string;
  id: string | null;
  name: string;
};

type SettingsSheetStackProps = {
  categories: Category[];
  incomeSources: IncomeSource[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitPreferences: () => void;
  onSubmitWallet: () => void;
  setSettingsDraft: Dispatch<SetStateAction<SettingsDraft>>;
  setWalletDraft: Dispatch<SetStateAction<WalletDraft>>;
  settings: AppSettings | null;
  settingsDraft: SettingsDraft;
  sheet: SettingsSheetKind;
  sheetError: string | null;
  walletDraft: WalletDraft;
  wallets: Wallet[];
};

const dateFormats: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const primaryCurrencies: PrimaryCurrency[] = ["USD", "CUP"];
const aiFrequencies: AiAnalysisFrequency[] = [
  "manual",
  "daily",
  "each_transaction",
];
const walletColors = ["#4F6BFF", "#18B7A4", "#F97316", "#E11D48"] as const;

function FieldLabel({
  hint,
  label,
}: {
  hint?: string;
  label: string;
}) {
  return (
    <View style={styles.fieldHeader}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function ChipButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chipButton,
        active && styles.chipButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipButtonText, active && styles.chipButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatAiFrequency(value: AiAnalysisFrequency) {
  if (value === "each_transaction") {
    return "Cada transaccion";
  }

  if (value === "daily") {
    return "Diario";
  }

  return "Manual";
}

export function SettingsSheetStack({
  categories,
  incomeSources,
  isSubmitting,
  onClose,
  onSubmitPreferences,
  onSubmitWallet,
  setSettingsDraft,
  setWalletDraft,
  settings,
  settingsDraft,
  sheet,
  sheetError,
  walletDraft,
  wallets,
}: SettingsSheetStackProps) {
  return (
    <>
      <BottomSheet onClose={onClose} visible={sheet === "preferences"}>
        <Text style={styles.sheetTitle}>Preferencias base</Text>
        <Text style={styles.sheetDescription}>
          Estos valores alimentan score, proyecciones y dashboard.
        </Text>

        <FieldLabel hint="0 a 100" label="Meta de ahorro mensual" />
        <TextInput
          keyboardType="number-pad"
          onChangeText={(value) =>
            setSettingsDraft((current) => ({
              ...current,
              savingsGoalPercent: value,
            }))
          }
          placeholder="20"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={settingsDraft.savingsGoalPercent}
        />

        <FieldLabel hint="Dia que reinicia el ciclo" label="Inicio del mes financiero" />
        <TextInput
          keyboardType="number-pad"
          onChangeText={(value) =>
            setSettingsDraft((current) => ({
              ...current,
              financialMonthStartDay: value,
            }))
          }
          placeholder="1"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={settingsDraft.financialMonthStartDay}
        />

        <FieldLabel hint="Promedio historico" label="Meses sin cobrar" />
        <TextInput
          keyboardType="number-pad"
          onChangeText={(value) =>
            setSettingsDraft((current) => ({
              ...current,
              avgMonthsWithoutPayment: value,
            }))
          }
          placeholder="0"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={settingsDraft.avgMonthsWithoutPayment}
        />

        <FieldLabel label="Moneda principal" />
        <View style={styles.chipRow}>
          {primaryCurrencies.map((option) => (
            <ChipButton
              key={option}
              active={settingsDraft.primaryCurrency === option}
              label={option}
              onPress={() =>
                setSettingsDraft((current) => ({
                  ...current,
                  primaryCurrency: option,
                }))
              }
            />
          ))}
        </View>

        <FieldLabel label="Formato de fecha" />
        <View style={styles.chipRow}>
          {dateFormats.map((option) => (
            <ChipButton
              key={option}
              active={settingsDraft.dateFormat === option}
              label={option}
              onPress={() =>
                setSettingsDraft((current) => ({
                  ...current,
                  dateFormat: option,
                }))
              }
            />
          ))}
        </View>

        <FieldLabel label="Frecuencia de analisis" />
        <View style={styles.chipRow}>
          {aiFrequencies.map((option) => (
            <ChipButton
              key={option}
              active={settingsDraft.aiAnalysisFrequency === option}
              label={formatAiFrequency(option)}
              onPress={() =>
                setSettingsDraft((current) => ({
                  ...current,
                  aiAnalysisFrequency: option,
                }))
              }
            />
          ))}
        </View>

        {sheetError ? <Text style={styles.errorText}>{sheetError}</Text> : null}

        <Pressable
          disabled={isSubmitting}
          onPress={onSubmitPreferences}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#08111F" />
          ) : (
            <Text style={styles.submitButtonText}>Guardar preferencias</Text>
          )}
        </Pressable>
      </BottomSheet>

      <BottomSheet onClose={onClose} visible={sheet === "wallet"}>
        <Text style={styles.sheetTitle}>
          {walletDraft.id ? "Editar wallet" : "Nueva wallet"}
        </Text>
        <Text style={styles.sheetDescription}>
          Puedes usar varias wallets activas y mover dinero entre ellas.
        </Text>

        <FieldLabel label="Nombre" />
        <TextInput
          onChangeText={(value) =>
            setWalletDraft((current) => ({ ...current, name: value }))
          }
          placeholder="Ej: Banco USD"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={walletDraft.name}
        />

        <FieldLabel hint="Ej: USD, CUP, EUR" label="Moneda" />
        <TextInput
          autoCapitalize="characters"
          onChangeText={(value) =>
            setWalletDraft((current) => ({ ...current, currency: value.toUpperCase() }))
          }
          placeholder="USD"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={walletDraft.currency}
        />

        <FieldLabel label="Color" />
        <View style={styles.colorRow}>
          {walletColors.map((color) => (
            <Pressable
              key={color}
              onPress={() =>
                setWalletDraft((current) => ({ ...current, color }))
              }
              style={({ pressed }) => [
                styles.colorSwatch,
                { backgroundColor: color },
                walletDraft.color === color && styles.colorSwatchActive,
                pressed && styles.pressed,
              ]}
            />
          ))}
        </View>

        {walletDraft.id ? (
          <Text style={styles.helperText}>
            Balance actual:{" "}
            {
              wallets.find((wallet) => wallet.id === walletDraft.id)?.balance.toFixed(2) ??
              "0.00"
            }{" "}
            {walletDraft.currency}
          </Text>
        ) : null}

        {sheetError ? <Text style={styles.errorText}>{sheetError}</Text> : null}

        <Pressable
          disabled={isSubmitting}
          onPress={onSubmitWallet}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#08111F" />
          ) : (
            <Text style={styles.submitButtonText}>
              {walletDraft.id ? "Guardar wallet" : "Crear wallet"}
            </Text>
          )}
        </Pressable>
      </BottomSheet>

      <BottomSheet onClose={onClose} visible={sheet === "libraries"}>
        <Text style={styles.sheetTitle}>Bibliotecas base</Text>
        <Text style={styles.sheetDescription}>
          En esta fase quedan visibles y listas para usar; el CRUD completo puede
          entrar despues sin tocar el resto de la app.
        </Text>

        <FieldLabel label={`Categorias (${categories.length})`} />
        <View style={styles.libraryGroup}>
          {categories.map((category) => (
            <View key={category.id} style={styles.libraryRow}>
              <View
                style={[
                  styles.libraryDot,
                  { backgroundColor: category.color || "#4562FF" },
                ]}
              />
              <Text style={styles.libraryText}>{category.name}</Text>
            </View>
          ))}
        </View>

        <FieldLabel label={`Fuentes de ingreso (${incomeSources.length})`} />
        <View style={styles.libraryGroup}>
          {incomeSources.map((source) => (
            <View key={source.id} style={styles.libraryRow}>
              <View style={[styles.libraryDot, styles.libraryDotNeutral]} />
              <Text style={styles.libraryText}>{source.name}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.helperText}>
          Formato actual: {settings?.dateFormat ?? "DD/MM/YYYY"} · Moneda principal:{" "}
          {settings?.primaryCurrency ?? "USD"}
        </Text>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  sheetDescription: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  fieldHeader: {
    gap: 4,
    marginBottom: 8,
    marginTop: 8,
  },
  fieldLabel: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  fieldHint: {
    color: "#8D98B2",
    fontSize: 12,
    lineHeight: 18,
  },
  sheetInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#08111F",
    color: "#F8FAFC",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chipButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#24314E",
    backgroundColor: "#11182D",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipButtonActive: {
    borderColor: "#4F6BFF",
    backgroundColor: "rgba(79, 107, 255, 0.16)",
  },
  chipButtonText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  chipButtonTextActive: {
    color: "#F8FAFC",
  },
  colorRow: {
    flexDirection: "row",
    gap: 14,
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#F8FAFC",
  },
  helperText: {
    color: "#8D98B2",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  libraryGroup: {
    gap: 10,
  },
  libraryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#141D32",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  libraryDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  libraryDotNeutral: {
    backgroundColor: "#94A3B8",
  },
  libraryText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#D9F99D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 18,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#08111F",
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.88,
  },
});
