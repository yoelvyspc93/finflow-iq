import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  CreateRecurringExpenseInput,
  RecurringExpenseFrequency,
  RecurringExpenseType,
} from "@/modules/commitments/types";

type ReferenceOption = {
  id: string;
  label: string;
};

type RecurringExpenseComposerCardProps = {
  categories: ReferenceOption[];
  isSubmitting: boolean;
  onSubmit: (values: CreateRecurringExpenseInput) => Promise<boolean>;
  submitError: string | null;
  walletId: string | null;
};

export function RecurringExpenseComposerCard({
  categories,
  isSubmitting,
  onSubmit,
  submitError,
  walletId,
}: RecurringExpenseComposerCardProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [billingMonth, setBillingMonth] = useState("1");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<RecurringExpenseType>("subscription");
  const [frequency, setFrequency] = useState<RecurringExpenseFrequency>("monthly");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!walletId) {
      setLocalError("Selecciona una billetera válida antes de guardar compromisos.");
      return;
    }

    const numericAmount = Number(amount);
    const numericBillingDay = Number(billingDay);
    const numericBillingMonth = Number(billingMonth);

    if (!name.trim()) {
      setLocalError("El compromiso necesita un nombre.");
      return;
    }

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setLocalError("El monto debe ser mayor que cero.");
      return;
    }

    if (
      Number.isNaN(numericBillingDay) ||
      numericBillingDay < 1 ||
      numericBillingDay > 31
    ) {
      setLocalError("El dia de cobro debe estar entre 1 y 31.");
      return;
    }

    if (
      frequency === "yearly" &&
      (Number.isNaN(numericBillingMonth) ||
        numericBillingMonth < 1 ||
        numericBillingMonth > 12)
    ) {
      setLocalError("El mes anual debe estar entre 1 y 12.");
      return;
    }

    setLocalError(null);
    const didSave = await onSubmit({
      amount: numericAmount,
      billingDay: numericBillingDay,
      billingMonth: frequency === "yearly" ? numericBillingMonth : null,
      categoryId,
      frequency,
      name: name.trim(),
      notes: notes.trim() || null,
      type,
      walletId,
    });

    if (didSave) {
      setName("");
      setAmount("");
      setBillingDay("1");
      setBillingMonth("1");
      setNotes("");
      setCategoryId(null);
      setFrequency("monthly");
      setType("subscription");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Agregar compromiso fijo</Text>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nombre</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Ej: internet o Spotify"
            placeholderTextColor="#64748B"
            style={styles.textInput}
            value={name}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Monto</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#64748B"
            style={styles.textInput}
            value={amount}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Tipo</Text>
          <View style={styles.chipRow}>
            {(
              [
                ["subscription", "Suscripcion"],
                ["fixed_expense", "Gasto fijo"],
              ] as const
            ).map(([option, label]) => {
              const isActive = type === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => setType(option)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Frecuencia</Text>
          <View style={styles.chipRow}>
            {(
              [
                ["monthly", "Mensual"],
                ["yearly", "Anual"],
              ] as const
            ).map(([option, label]) => {
              const isActive = frequency === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => setFrequency(option)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Dia de cobro</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setBillingDay}
            placeholder="1"
            placeholderTextColor="#64748B"
            style={styles.textInput}
            value={billingDay}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Mes anual</Text>
          <TextInput
            editable={frequency === "yearly"}
            keyboardType="number-pad"
            onChangeText={setBillingMonth}
            placeholder="1"
            placeholderTextColor="#64748B"
            style={[
              styles.textInput,
              frequency !== "yearly" && styles.textInputDisabled,
            ]}
            value={billingMonth}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Categoría</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setCategoryId(null)}
            style={[styles.chip, categoryId === null && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                categoryId === null && styles.chipTextActive,
              ]}
            >
              Sin categoria
            </Text>
          </Pressable>

          {categories.map((category) => {
            const isActive = categoryId === category.id;

            return (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Notas</Text>
        <TextInput
          onChangeText={setNotes}
          placeholder="Opcional"
          placeholderTextColor="#64748B"
          style={styles.textInput}
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
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
          pressed && !isSubmitting && styles.submitButtonPressed,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.submitButtonText}>Guardar compromiso</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#0C1324",
    gap: 14,
    padding: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
    gap: 8,
  },
  fieldLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  textInput: {
    borderRadius: 16,
    backgroundColor: "#121B31",
    color: "#F8FAFC",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textInputDisabled: {
    opacity: 0.4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#24314E",
    backgroundColor: "#11182D",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    borderColor: "#FDE68A",
    backgroundColor: "rgba(253, 230, 138, 0.14)",
  },
  chipText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#F8FAFC",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDE68A",
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitButtonText: {
    color: "#08111F",
    fontSize: 15,
    fontWeight: "800",
  },
});
