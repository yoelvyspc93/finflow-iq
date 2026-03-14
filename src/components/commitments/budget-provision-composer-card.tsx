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
  BudgetProvisionRecurrence,
  CreateBudgetProvisionInput,
} from "@/modules/provisions/types";

type ReferenceOption = {
  id: string;
  label: string;
};

type BudgetProvisionComposerCardProps = {
  categories: ReferenceOption[];
  isSubmitting: boolean;
  onSubmit: (values: CreateBudgetProvisionInput) => Promise<boolean>;
  submitError: string | null;
  walletId: string | null;
};

function createCurrentMonthString() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export function BudgetProvisionComposerCard({
  categories,
  isSubmitting,
  onSubmit,
  submitError,
  walletId,
}: BudgetProvisionComposerCardProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(createCurrentMonthString());
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] =
    useState<BudgetProvisionRecurrence>("once");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!walletId) {
      setLocalError("Selecciona una wallet valida antes de guardar provisiones.");
      return;
    }

    const numericAmount = Number(amount);

    if (!name.trim()) {
      setLocalError("La provision necesita un nombre.");
      return;
    }

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setLocalError("El monto debe ser mayor que cero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(month)) {
      setLocalError("El mes debe usar formato YYYY-MM-DD.");
      return;
    }

    setLocalError(null);
    const didSave = await onSubmit({
      amount: numericAmount,
      categoryId,
      month,
      name: name.trim(),
      notes: notes.trim() || null,
      recurrence,
      walletId,
    });

    if (didSave) {
      setName("");
      setAmount("");
      setMonth(createCurrentMonthString());
      setNotes("");
      setCategoryId(null);
      setRecurrence("once");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Agregar evento presupuestado</Text>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nombre</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Ej: regalo o viaje corto"
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
          <Text style={styles.fieldLabel}>Mes</Text>
          <TextInput
            onChangeText={setMonth}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748B"
            style={styles.textInput}
            value={month}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Recurrencia</Text>
          <View style={styles.chipRow}>
            {(
              [
                ["once", "Una vez"],
                ["yearly", "Anual"],
              ] as const
            ).map(([option, label]) => {
              const isActive = recurrence === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => setRecurrence(option)}
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

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Categoria</Text>
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
          <Text style={styles.submitButtonText}>Guardar provision</Text>
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
    borderColor: "#FDBA74",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
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
    backgroundColor: "#FDBA74",
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
