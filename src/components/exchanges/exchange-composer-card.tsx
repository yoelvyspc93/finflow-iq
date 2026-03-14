import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Wallet } from "@/modules/wallets/types";

export type SubmitExchangeValues = {
  date: string;
  description: string | null;
  destinationAmount: number;
  destinationWalletId: string;
  exchangeRate: number;
  sourceAmount: number;
};

type ExchangeComposerCardProps = {
  activeWallet: Wallet | null;
  isSubmitting: boolean;
  onSubmit: (values: SubmitExchangeValues) => Promise<boolean>;
  submitError: string | null;
  wallets: Wallet[];
};

function createTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function ExchangeComposerCard({
  activeWallet,
  isSubmitting,
  onSubmit,
  submitError,
  wallets,
}: ExchangeComposerCardProps) {
  const [destinationWalletId, setDestinationWalletId] = useState<string | null>(
    null,
  );
  const [sourceAmount, setSourceAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [date, setDate] = useState(createTodayString());
  const [description, setDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const destinationWallets = useMemo(
    () =>
      wallets.filter(
        (wallet) => wallet.isActive && wallet.id !== activeWallet?.id,
      ),
    [activeWallet?.id, wallets],
  );

  useEffect(() => {
    if (!destinationWallets.length) {
      setDestinationWalletId(null);
      return;
    }

    if (
      destinationWalletId &&
      destinationWallets.some((wallet) => wallet.id === destinationWalletId)
    ) {
      return;
    }

    setDestinationWalletId(destinationWallets[0]?.id ?? null);
  }, [destinationWalletId, destinationWallets]);

  const resolvedDestinationWallet = useMemo(
    () =>
      destinationWallets.find((wallet) => wallet.id === destinationWalletId) ?? null,
    [destinationWalletId, destinationWallets],
  );

  const sourceNumericAmount = Number(sourceAmount);
  const numericExchangeRate = Number(exchangeRate);
  const destinationAmount =
    Number.isFinite(sourceNumericAmount) &&
    sourceNumericAmount > 0 &&
    Number.isFinite(numericExchangeRate) &&
    numericExchangeRate > 0
      ? Number((sourceNumericAmount * numericExchangeRate).toFixed(2))
      : 0;

  const canTransfer = Boolean(activeWallet && destinationWallets.length >= 1);

  async function handleSubmit() {
    if (!canTransfer || !destinationWalletId) {
      setLocalError("Necesitas al menos dos wallets activas para transferir.");
      return;
    }

    if (
      Number.isNaN(sourceNumericAmount) ||
      Number.isNaN(numericExchangeRate) ||
      sourceNumericAmount <= 0 ||
      numericExchangeRate <= 0
    ) {
      setLocalError("Monto y tasa deben ser mayores que cero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setLocalError("La fecha debe tener formato YYYY-MM-DD.");
      return;
    }

    setLocalError(null);
    const didSave = await onSubmit({
      date,
      description: description.trim() || null,
      destinationAmount,
      destinationWalletId,
      exchangeRate: numericExchangeRate,
      sourceAmount: sourceNumericAmount,
    });

    if (didSave) {
      setSourceAmount("");
      setExchangeRate("1");
      setDescription("");
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.title}>Transferir entre wallets</Text>
          <Text style={styles.subtitle}>
            Mueve saldo entre bolsillos y deja doble rastro en el ledger.
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⇄</Text>
        </View>
      </View>

      {!canTransfer ? (
        <View style={styles.infoState}>
          <Text style={styles.infoTitle}>Transferencias bloqueadas</Text>
          <Text style={styles.infoText}>
            Activa una segunda wallet para habilitar cambios o traspasos internos.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.walletSummaryRow}>
            <View style={styles.walletSummaryCard}>
              <Text style={styles.summaryLabel}>Origen</Text>
              <Text style={styles.summaryValue}>{activeWallet?.name}</Text>
              <Text style={styles.summaryHint}>
                {activeWallet?.currency} disponible {activeWallet?.balance.toFixed(2)}
              </Text>
            </View>

            <View style={styles.walletSummaryCard}>
              <Text style={styles.summaryLabel}>Destino</Text>
              <Text style={styles.summaryValue}>
                {resolvedDestinationWallet?.name ?? "Selecciona"}
              </Text>
              <Text style={styles.summaryHint}>
                {resolvedDestinationWallet?.currency ?? "--"}
              </Text>
            </View>
          </View>

          <View style={styles.destinationGrid}>
            {destinationWallets.map((wallet) => {
              const isActive = wallet.id === destinationWalletId;

              return (
                <Pressable
                  key={wallet.id}
                  onPress={() => setDestinationWalletId(wallet.id)}
                  style={[styles.destinationChip, isActive && styles.destinationChipActive]}
                >
                  <Text
                    style={[
                      styles.destinationChipText,
                      isActive && styles.destinationChipTextActive,
                    ]}
                  >
                    {wallet.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                Monto origen {activeWallet?.currency ?? ""}
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setSourceAmount}
                placeholder="0.00"
                placeholderTextColor="#64748B"
                style={styles.textInput}
                value={sourceAmount}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tasa</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setExchangeRate}
                placeholder="1.00"
                placeholderTextColor="#64748B"
                style={styles.textInput}
                value={exchangeRate}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                Recibe {resolvedDestinationWallet?.currency ?? "--"}
              </Text>
              <View style={styles.readonlyValue}>
                <Text style={styles.readonlyValueText}>
                  {destinationAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748B"
                style={styles.textInput}
                value={date}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Descripcion</Text>
            <TextInput
              onChangeText={setDescription}
              placeholder="Ej: cambio de USD a CUP"
              placeholderTextColor="#64748B"
              style={styles.textInput}
              value={description}
            />
          </View>
        </>
      )}

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Pressable
        disabled={isSubmitting || !canTransfer}
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [
          styles.submitButton,
          (!canTransfer || isSubmitting) && styles.submitButtonDisabled,
          pressed && canTransfer && !isSubmitting && styles.submitButtonPressed,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.submitButtonText}>Registrar transferencia</Text>
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextGroup: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217, 249, 157, 0.16)",
  },
  badgeText: {
    color: "#D9F99D",
    fontSize: 18,
    fontWeight: "900",
  },
  infoState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    backgroundColor: "#121B31",
    gap: 8,
    padding: 16,
  },
  infoTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  infoText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
  walletSummaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  walletSummaryCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#121B31",
    gap: 4,
    padding: 14,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  summaryHint: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  destinationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  destinationChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#24314E",
    backgroundColor: "#11182D",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  destinationChipActive: {
    borderColor: "#D9F99D",
    backgroundColor: "rgba(217, 249, 157, 0.12)",
  },
  destinationChipText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  destinationChipTextActive: {
    color: "#F8FAFC",
  },
  inputRow: {
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
  readonlyValue: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#121B31",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  readonlyValueText: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D9F99D",
  },
  submitButtonDisabled: {
    opacity: 0.5,
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
