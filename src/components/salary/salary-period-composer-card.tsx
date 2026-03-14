import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type SalaryPeriodFormValues = {
  expectedAmount: number;
  notes: string | null;
  periodMonth: string;
};

type SalaryPeriodComposerCardProps = {
  currency: string;
  isSubmitting: boolean;
  onSubmit: (values: SalaryPeriodFormValues) => Promise<boolean>;
  submitError: string | null;
};

function getCurrentMonthStart() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export function SalaryPeriodComposerCard({
  currency,
  isSubmitting,
  onSubmit,
  submitError,
}: SalaryPeriodComposerCardProps) {
  const [periodMonth, setPeriodMonth] = useState(getCurrentMonthStart());
  const [expectedAmount, setExpectedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit() {
    const amount = Number(expectedAmount);

    if (!/^\d{4}-\d{2}-01$/.test(periodMonth)) {
      setLocalError("El periodo debe usar formato YYYY-MM-01.");
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      setLocalError("El monto esperado debe ser mayor que cero.");
      return;
    }

    setLocalError(null);

    const didSave = await onSubmit({
      expectedAmount: amount,
      notes: notes.trim() || null,
      periodMonth,
    });

    if (didSave) {
      setExpectedAmount("");
      setNotes("");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nuevo periodo de nomina</Text>
      <Text style={styles.helper}>Moneda activa: {currency}</Text>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Periodo</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setPeriodMonth}
          placeholder="YYYY-MM-01"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={periodMonth}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Monto esperado</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setExpectedAmount}
          placeholder="0.00"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={expectedAmount}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Notas</Text>
        <TextInput
          onChangeText={setNotes}
          placeholder="Opcional"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={notes}
        />
      </View>

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && !isSubmitting && styles.buttonPressed,
          isSubmitting && styles.buttonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.buttonText}>Guardar periodo</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#0C1324",
    gap: 12,
    padding: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  helper: {
    color: "#94A3B8",
    fontSize: 13,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: "#8DA1C4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 16,
    backgroundColor: "#121B31",
    color: "#F8FAFC",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#D9F99D",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#08111F",
    fontSize: 15,
    fontWeight: "800",
  },
});
