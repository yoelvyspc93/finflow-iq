import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { BudgetProvision } from "@/modules/provisions/types";
import type { RecurringExpense } from "@/modules/commitments/types";

export type SubmitCommitmentSettlementValues = {
  amount: number;
  commitmentId: string;
  date: string;
  description: string | null;
  kind: "provision" | "recurring";
};

type CommitmentSettlementCardProps = {
  budgetProvisions: BudgetProvision[];
  isSubmitting: boolean;
  onSubmit: (values: SubmitCommitmentSettlementValues) => Promise<boolean>;
  recurringExpenses: RecurringExpense[];
  submitError: string | null;
};

function createTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function CommitmentSettlementCard({
  budgetProvisions,
  isSubmitting,
  onSubmit,
  recurringExpenses,
  submitError,
}: CommitmentSettlementCardProps) {
  const [kind, setKind] = useState<"provision" | "recurring">("recurring");
  const [commitmentId, setCommitmentId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(createTodayString());
  const [description, setDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const options = useMemo(
    () =>
      kind === "recurring"
        ? recurringExpenses.map((expense) => ({
            id: expense.id,
            label: expense.name,
            meta: `${expense.frequency} | ${expense.amount.toFixed(2)}`,
          }))
        : budgetProvisions.map((provision) => ({
            id: provision.id,
            label: provision.name,
            meta: `${provision.recurrence} | ${provision.amount.toFixed(2)}`,
          })),
    [budgetProvisions, kind, recurringExpenses],
  );

  useEffect(() => {
    if (!options.length) {
      setCommitmentId(null);
      return;
    }

    if (commitmentId && options.some((option) => option.id === commitmentId)) {
      return;
    }

    setCommitmentId(options[0]?.id ?? null);
  }, [commitmentId, options]);

  async function handleSubmit() {
    const numericAmount = Number(amount);

    if (!commitmentId) {
      setLocalError("Selecciona un compromiso antes de registrar el pago.");
      return;
    }

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
      commitmentId,
      date,
      description: description.trim() || null,
      kind,
    });

    if (didSave) {
      setAmount("");
      setDescription("");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Registrar pago real</Text>

      <View style={styles.chipRow}>
        {(
          [
            ["recurring", "Compromiso fijo"],
            ["provision", "Evento presupuestado"],
          ] as const
        ).map(([option, label]) => {
          const isActive = kind === option;

          return (
            <Pressable
              key={option}
              onPress={() => setKind(option)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.optionGrid}>
        {options.length ? (
          options.map((option) => {
            const isActive = option.id === commitmentId;

            return (
              <Pressable
                key={option.id}
                onPress={() => setCommitmentId(option.id)}
                style={[styles.optionCard, isActive && styles.optionCardActive]}
              >
                <Text style={styles.optionTitle}>{option.label}</Text>
                <Text style={styles.optionMeta}>{option.meta}</Text>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Todavia no hay items para pagar</Text>
            <Text style={styles.emptyText}>
              Crea un compromiso o una provision antes de registrar el gasto real.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Monto pagado</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#64748B"
            style={styles.textInput}
            value={amount}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Fecha</Text>
          <TextInput
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#64748B"
            style={styles.textInput}
            value={date}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Descripción</Text>
        <TextInput
          onChangeText={setDescription}
          placeholder="Opcional"
          placeholderTextColor="#64748B"
          style={styles.textInput}
          value={description}
        />
      </View>

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Pressable
        disabled={isSubmitting || !options.length}
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [
          styles.submitButton,
          (isSubmitting || !options.length) && styles.submitButtonDisabled,
          pressed &&
            !isSubmitting &&
            options.length > 0 &&
            styles.submitButtonPressed,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.submitButtonText}>Registrar pago</Text>
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
    borderColor: "#FCA5A5",
    backgroundColor: "rgba(248, 113, 113, 0.14)",
  },
  chipText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#F8FAFC",
  },
  optionGrid: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#24314E",
    backgroundColor: "#121B31",
    gap: 4,
    padding: 14,
  },
  optionCardActive: {
    borderColor: "#FDBA74",
    backgroundColor: "rgba(251, 146, 60, 0.12)",
  },
  optionTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  optionMeta: {
    color: "#94A3B8",
    fontSize: 12,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    backgroundColor: "#11182D",
    gap: 8,
    padding: 16,
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
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
