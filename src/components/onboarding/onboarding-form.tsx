import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { DateFormat } from "@/modules/settings/types";

const currencyOptions = ["USD", "CUP"] as const;
const walletColors = ["#4F6BFF", "#18B7A4", "#F97316", "#E11D48"] as const;
const dateFormats: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

export type OnboardingFormValues = {
  dateFormat: DateFormat;
  savingsGoalPercent: number;
  walletColor: string;
  walletCurrency: (typeof currencyOptions)[number];
  walletName: string;
};

type OnboardingFormProps = {
  initialDateFormat: DateFormat;
  initialSavingsGoalPercent: number;
  isSubmitting: boolean;
  onSubmit: (values: OnboardingFormValues) => void;
  submitError: string | null;
};

export function OnboardingForm({
  initialDateFormat,
  initialSavingsGoalPercent,
  isSubmitting,
  onSubmit,
  submitError,
}: OnboardingFormProps) {
  const [walletName, setWalletName] = useState("Main Wallet");
  const [walletCurrency, setWalletCurrency] =
    useState<OnboardingFormValues["walletCurrency"]>("USD");
  const [walletColor, setWalletColor] = useState<string>(walletColors[0]);
  const [dateFormat, setDateFormat] = useState<DateFormat>(initialDateFormat);
  const [savingsGoalPercent, setSavingsGoalPercent] = useState(
    String(initialSavingsGoalPercent),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const previewLabel = useMemo(() => {
    return walletName.trim() || "Wallet principal";
  }, [walletName]);

  function handleSubmit() {
    const normalizedName = walletName.trim();
    const numericSavingsGoal = Number(savingsGoalPercent);

    if (!normalizedName) {
      setLocalError("Escribe un nombre para tu primera wallet.");
      return;
    }

    if (
      Number.isNaN(numericSavingsGoal) ||
      numericSavingsGoal < 0 ||
      numericSavingsGoal > 100
    ) {
      setLocalError("La meta de ahorro debe ser un numero entre 0 y 100.");
      return;
    }

    setLocalError(null);
    onSubmit({
      dateFormat,
      savingsGoalPercent: numericSavingsGoal,
      walletColor,
      walletCurrency,
      walletName: normalizedName,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Primer arranque</Text>
        <Text style={styles.title}>Configura tu base financiera</Text>
        <Text style={styles.description}>
          Crea tu primera wallet y define las dos preferencias minimas que
          condicionan el resto de la app.
        </Text>

        <View style={[styles.previewCard, { borderColor: walletColor }]}>
          <View style={[styles.previewAccent, { backgroundColor: walletColor }]} />
          <View style={styles.previewText}>
            <Text style={styles.previewLabel}>{previewLabel}</Text>
            <Text style={styles.previewMeta}>
              {walletCurrency} | ahorro objetivo {savingsGoalPercent || "0"}%
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet principal</Text>
        <TextInput
          onChangeText={setWalletName}
          placeholder="Ej: Efectivo personal"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={walletName}
        />

        <View style={styles.segmentRow}>
          {currencyOptions.map((option) => {
            const isActive = walletCurrency === option;

            return (
              <Pressable
                key={option}
                onPress={() => setWalletCurrency(option)}
                style={[
                  styles.segmentButton,
                  isActive && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    isActive && styles.segmentButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.colorRow}>
          {walletColors.map((option) => {
            const isActive = walletColor === option;

            return (
              <Pressable
                key={option}
                onPress={() => setWalletColor(option)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: option },
                  isActive && styles.colorSwatchActive,
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias iniciales</Text>

        <TextInput
          keyboardType="number-pad"
          onChangeText={setSavingsGoalPercent}
          placeholder="20"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={savingsGoalPercent}
        />
        <Text style={styles.sectionHint}>Porcentaje de ahorro sugerido para cada mes.</Text>

        <View style={styles.dateGrid}>
          {dateFormats.map((option) => {
            const isActive = dateFormat === option;

            return (
              <Pressable
                key={option}
                onPress={() => setDateFormat(option)}
                style={[
                  styles.dateButton,
                  isActive && styles.dateButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    isActive && styles.dateButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.submitButton,
          pressed && !isSubmitting && styles.submitButtonPressed,
          isSubmitting && styles.submitButtonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.submitButtonText}>Entrar a la app</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 24,
  },
  heroCard: {
    borderRadius: 30,
    backgroundColor: "#121B31",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.18)",
    gap: 12,
    padding: 24,
  },
  eyebrow: {
    color: "#A5B4FC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
  },
  description: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "#0C1324",
    padding: 16,
  },
  previewAccent: {
    width: 14,
    alignSelf: "stretch",
    borderRadius: 999,
  },
  previewText: {
    gap: 4,
  },
  previewLabel: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  previewMeta: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  section: {
    borderRadius: 24,
    backgroundColor: "#0D1427",
    gap: 14,
    padding: 20,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionHint: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#08111F",
    color: "#F8FAFC",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#24314E",
    backgroundColor: "#11182D",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  segmentButtonActive: {
    borderColor: "#4F6BFF",
    backgroundColor: "rgba(79, 107, 255, 0.16)",
  },
  segmentButtonText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  segmentButtonTextActive: {
    color: "#F8FAFC",
  },
  colorRow: {
    flexDirection: "row",
    gap: 14,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#F8FAFC",
  },
  dateGrid: {
    gap: 10,
  },
  dateButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#24314E",
    backgroundColor: "#11182D",
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dateButtonActive: {
    borderColor: "#4F6BFF",
    backgroundColor: "rgba(79, 107, 255, 0.16)",
  },
  dateButtonText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  dateButtonTextActive: {
    color: "#F8FAFC",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#D9F99D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#08111F",
    fontSize: 15,
    fontWeight: "800",
  },
});
