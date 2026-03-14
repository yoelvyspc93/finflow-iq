import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getSalaryPeriodPendingAmount } from "@/modules/salary/calculations";
import type {
  SalaryAllocationInput,
  SalaryPeriod,
} from "@/modules/salary/types";

type SalaryPaymentFormValues = {
  allocations: SalaryAllocationInput[];
  amount: number;
  description: string | null;
  paymentDate: string;
};

type SalaryPaymentComposerCardProps = {
  currency: string;
  isSubmitting: boolean;
  onSubmit: (values: SalaryPaymentFormValues) => Promise<boolean>;
  periods: SalaryPeriod[];
  submitError: string | null;
  walletName: string;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function SalaryPaymentComposerCard({
  currency,
  isSubmitting,
  onSubmit,
  periods,
  submitError,
  walletName,
}: SalaryPaymentComposerCardProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getToday());
  const [description, setDescription] = useState("");
  const [allocationDrafts, setAllocationDrafts] = useState<Record<string, string>>(
    {},
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const pendingPeriods = useMemo(
    () => periods.filter((period) => getSalaryPeriodPendingAmount(period) > 0),
    [periods],
  );

  async function handleSubmit() {
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setLocalError("El monto recibido debe ser mayor que cero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      setLocalError("La fecha debe usar formato YYYY-MM-DD.");
      return;
    }

    const allocations = pendingPeriods
      .map((period) => ({
        amount: Number(allocationDrafts[period.id] ?? 0),
        salaryPeriodId: period.id,
      }))
      .filter((allocation) => allocation.amount > 0);

    const allocatedTotal = allocations.reduce(
      (total, allocation) => total + allocation.amount,
      0,
    );

    if (allocatedTotal > numericAmount) {
      setLocalError("La distribucion no puede exceder el cobro registrado.");
      return;
    }

    setLocalError(null);

    const didSave = await onSubmit({
      allocations,
      amount: numericAmount,
      description: description.trim() || null,
      paymentDate,
    });

    if (didSave) {
      setAmount("");
      setDescription("");
      setAllocationDrafts({});
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Registrar cobro</Text>
      <Text style={styles.helper}>
        Wallet activa: {walletName} | moneda {currency}
      </Text>

      <View style={styles.row}>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Monto recibido</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={amount}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Fecha</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPaymentDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={paymentDate}
          />
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Descripcion</Text>
        <TextInput
          onChangeText={setDescription}
          placeholder="Opcional"
          placeholderTextColor="#64748B"
          style={styles.input}
          value={description}
        />
      </View>

      <View style={styles.allocationsCard}>
        <Text style={styles.allocationsTitle}>Distribucion por periodo</Text>
        {pendingPeriods.length ? (
          pendingPeriods.map((period) => (
            <View key={period.id} style={styles.allocationRow}>
              <View style={styles.allocationText}>
                <Text style={styles.allocationPeriod}>{period.periodMonth}</Text>
                <Text style={styles.allocationMeta}>
                  Pendiente {currency} {getSalaryPeriodPendingAmount(period).toFixed(2)}
                </Text>
              </View>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setAllocationDrafts((current) => ({
                    ...current,
                    [period.id]: value,
                  }))
                }
                placeholder="0"
                placeholderTextColor="#64748B"
                style={styles.allocationInput}
                value={allocationDrafts[period.id] ?? ""}
              />
            </View>
          ))
        ) : (
          <Text style={styles.noPendingText}>
            No hay periodos pendientes para esta moneda.
          </Text>
        )}
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
          <Text style={styles.buttonText}>Guardar cobro</Text>
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  fieldBlock: {
    flex: 1,
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
  allocationsCard: {
    borderRadius: 18,
    backgroundColor: "#121B31",
    gap: 10,
    padding: 14,
  },
  allocationsTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "800",
  },
  allocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  allocationText: {
    flex: 1,
    gap: 4,
  },
  allocationPeriod: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  allocationMeta: {
    color: "#94A3B8",
    fontSize: 12,
  },
  allocationInput: {
    width: 92,
    borderRadius: 14,
    backgroundColor: "#0B1222",
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlign: "right",
  },
  noPendingText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
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
