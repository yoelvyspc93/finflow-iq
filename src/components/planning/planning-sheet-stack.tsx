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
import type { Wallet } from "@/modules/wallets/types";

export type PlanningSheetKind = "wish" | null;

export type WishDraft = {
  amount: string;
  name: string;
  notes: string;
  priority: string;
  walletId: string;
};

type PlanningSheetStackProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitWish: () => void;
  setWishDraft: Dispatch<SetStateAction<WishDraft>>;
  sheet: PlanningSheetKind;
  sheetError: string | null;
  wallets: Wallet[];
  wishDraft: WishDraft;
};

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

export function PlanningSheetStack({
  isSubmitting,
  onClose,
  onSubmitWish,
  setWishDraft,
  sheet,
  sheetError,
  wallets,
  wishDraft,
}: PlanningSheetStackProps) {
  const activeWallets = wallets.filter((wallet) => wallet.isActive);

  return (
    <BottomSheet onClose={onClose} visible={sheet === "wish"}>
      <Text style={styles.sheetTitle}>Nuevo deseo</Text>
      <Text style={styles.sheetDescription}>
        La prioridad define el orden de compra y afecta la fecha estimada.
      </Text>

      <FieldLabel label="Nombre" />
      <TextInput
        onChangeText={(value) =>
          setWishDraft((current) => ({ ...current, name: value }))
        }
        placeholder="Ej: Monitor ultrawide"
        placeholderTextColor="#64748B"
        style={styles.sheetInput}
        value={wishDraft.name}
      />

      <FieldLabel label="Monto estimado" />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) =>
          setWishDraft((current) => ({ ...current, amount: value }))
        }
        placeholder="600"
        placeholderTextColor="#64748B"
        style={styles.sheetInput}
        value={wishDraft.amount}
      />

      <FieldLabel hint="1 es la máxima prioridad" label="Prioridad" />
      <TextInput
        keyboardType="number-pad"
        onChangeText={(value) =>
          setWishDraft((current) => ({ ...current, priority: value }))
        }
        placeholder="1"
        placeholderTextColor="#64748B"
        style={styles.sheetInput}
        value={wishDraft.priority}
      />

      <FieldLabel label="Billetera" />
      <View style={styles.chipRow}>
        {activeWallets.map((wallet) => (
          <ChipButton
            key={wallet.id}
            active={wishDraft.walletId === wallet.id}
            label={`${wallet.name} - ${wallet.currency}`}
            onPress={() =>
              setWishDraft((current) => ({ ...current, walletId: wallet.id }))
            }
          />
        ))}
      </View>

      <FieldLabel hint="Opcional" label="Notas" />
      <TextInput
        multiline
        onChangeText={(value) =>
          setWishDraft((current) => ({ ...current, notes: value }))
        }
        placeholder="Esperar oferta o dividir en 2 meses"
        placeholderTextColor="#64748B"
        style={[styles.sheetInput, styles.sheetTextArea]}
        value={wishDraft.notes}
      />

      {sheetError ? <Text style={styles.errorText}>{sheetError}</Text> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={onSubmitWish}
        style={({ pressed }) => [
          styles.submitButton,
          pressed && !isSubmitting && styles.pressed,
          isSubmitting && styles.submitButtonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#08111F" />
        ) : (
          <Text style={styles.submitButtonText}>Guardar deseo</Text>
        )}
      </Pressable>
    </BottomSheet>
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
  sheetTextArea: {
    minHeight: 100,
    textAlignVertical: "top",
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
