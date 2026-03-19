import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ReferenceOption = {
  id: string;
  label: string;
};

export type MovementMode = "income" | "expense";

export type SubmitMovementValues = {
  amount: number;
  date: string;
  description: string | null;
  referenceId: string | null;
};

type MovementComposerCardProps = {
  expenseOptions: ReferenceOption[];
  incomeOptions: ReferenceOption[];
  isSubmitting: boolean;
  mode: MovementMode;
  onModeChange: (mode: MovementMode) => void;
  onSubmit: (values: SubmitMovementValues) => Promise<boolean>;
  submitError: string | null;
};

function createTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function MovementComposerCard({
  expenseOptions,
  incomeOptions,
  isSubmitting,
  mode,
  onModeChange,
  onSubmit,
  submitError,
}: MovementComposerCardProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(createTodayString());
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const options = mode === "income" ? incomeOptions : expenseOptions;

  function handleModeChange(nextMode: MovementMode) {
    setLocalError(null);
    setReferenceId(null);
    onModeChange(nextMode);
  }

  async function handleSubmit() {
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setLocalError("El monto debe ser mayor que cero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setLocalError("La fecha debe tener el formato AAAA-MM-DD.");
      return;
    }

    setLocalError(null);
    const didSave = await onSubmit({
      amount: numericAmount,
      date,
      description: description.trim() || null,
      referenceId,
    });

    if (didSave) {
      setAmount("");
      setDescription("");
      setReferenceId(null);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Movimiento rápido</Text>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => handleModeChange("income")}
            style={[
              styles.modeButton,
              mode === "income" && styles.modeButtonIncomeActive,
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "income" && styles.modeButtonTextActive,
              ]}
            >
              Ingreso
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleModeChange("expense")}
            style={[
              styles.modeButton,
              mode === "expense" && styles.modeButtonExpenseActive,
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "expense" && styles.modeButtonTextActive,
              ]}
            >
              Gasto
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.amountField}>
          <Text style={styles.fieldLabel}>Monto</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#64748B"
            style={styles.amountInput}
            value={amount}
          />
        </View>

        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>Fecha</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#64748B"
            style={styles.dateInput}
            value={date}
          />
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Descripción</Text>
        <TextInput
          onChangeText={setDescription}
          placeholder={
            mode === "income"
              ? "Ej: cobro freelance"
              : "Ej: compra del mercado"
          }
          placeholderTextColor="#64748B"
          style={styles.textInput}
          value={description}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>
          {mode === "income" ? "Fuente de ingreso" : "Categoría"}
        </Text>
        <View style={styles.optionGrid}>
          <Pressable
            onPress={() => setReferenceId(null)}
            style={[
              styles.optionChip,
              referenceId === null && styles.optionChipActive,
            ]}
          >
            <Text
              style={[
                styles.optionChipText,
                referenceId === null && styles.optionChipTextActive,
              ]}
            >
              Sin etiqueta
            </Text>
          </Pressable>

          {options.map((option) => {
            const isActive = referenceId === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => setReferenceId(option.id)}
                style={[styles.optionChip, isActive && styles.optionChipActive]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    isActive && styles.optionChipTextActive,
                  ]}
                >
                  {option.label}
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
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [
          styles.submitButton,
          pressed && !isSubmitting && styles.submitButtonPressed,
          isSubmitting && styles.submitButtonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.submitButtonText}>
            {mode === "income" ? "Registrar ingreso" : "Registrar gasto"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: "#0C1324",
    gap: 16,
    padding: 18,
  },
  headerRow: {
    gap: 14,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#131D34",
  },
  modeButtonIncomeActive: {
    backgroundColor: "#D9F99D",
  },
  modeButtonExpenseActive: {
    backgroundColor: "#FCA5A5",
  },
  modeButtonText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: "#08111F",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  amountField: {
    flex: 1.1,
    gap: 8,
  },
  dateField: {
    flex: 0.9,
    gap: 8,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  amountInput: {
    borderRadius: 18,
    backgroundColor: "#121B31",
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateInput: {
    borderRadius: 18,
    backgroundColor: "#121B31",
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  textInput: {
    borderRadius: 16,
    backgroundColor: "#121B31",
    color: "#F8FAFC",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#24314E",
    backgroundColor: "#11182D",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionChipActive: {
    borderColor: "#4F6BFF",
    backgroundColor: "rgba(79, 107, 255, 0.18)",
  },
  optionChipText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  optionChipTextActive: {
    color: "#F8FAFC",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#D9F99D",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonText: {
    color: "#08111F",
    fontSize: 15,
    fontWeight: "800",
  },
});
