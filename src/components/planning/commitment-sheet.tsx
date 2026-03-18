import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { Wallet } from "@/modules/wallets/types";
import { theme } from "@/utils/theme";

export type PlanningCommitmentDraft = {
  amount: string;
  day: string;
  kind: "fixed" | "event";
  month: string;
  name: string;
  notes: string;
  walletId: string;
};

type CommitmentSheetProps = {
  draft: PlanningCommitmentDraft;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  setDraft: React.Dispatch<React.SetStateAction<PlanningCommitmentDraft>>;
  visible: boolean;
  wallets: Wallet[];
};

export function CommitmentSheet({
  draft,
  error,
  isSubmitting,
  onClose,
  onSubmit,
  setDraft,
  visible,
  wallets,
}: CommitmentSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.sheetTitle}>Adicionar compromiso</Text>
      <Text style={styles.softText}>
        Puedes crear un fijo mensual o un evento especial futuro.
      </Text>

      <Text style={styles.label}>TIPO</Text>
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => setDraft((current) => ({ ...current, kind: "fixed" }))}
          style={[styles.chip, draft.kind === "fixed" && styles.chipActive]}
        >
          <Text style={[styles.chipText, draft.kind === "fixed" && styles.chipTextActive]}>
            Fijo mensual
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDraft((current) => ({ ...current, kind: "event" }))}
          style={[styles.chip, draft.kind === "event" && styles.chipActive]}
        >
          <Text style={[styles.chipText, draft.kind === "event" && styles.chipTextActive]}>
            Evento
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>NOMBRE</Text>
      <TextInput
        onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))}
        placeholder="Ej: Renta casa"
        placeholderTextColor="#7C89A8"
        style={styles.input}
        value={draft.name}
      />

      <Text style={styles.label}>MONTO</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => setDraft((current) => ({ ...current, amount: value }))}
        placeholder="120"
        placeholderTextColor="#7C89A8"
        style={styles.input}
        value={draft.amount}
      />

      <Text style={styles.label}>WALLET</Text>
      <View style={styles.chipRow}>
        {wallets
          .filter((wallet) => wallet.isActive)
          .map((wallet) => (
            <Pressable
              key={wallet.id}
              onPress={() =>
                setDraft((current) => ({
                  ...current,
                  walletId: wallet.id,
                }))
              }
              style={[styles.chip, draft.walletId === wallet.id && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  draft.walletId === wallet.id && styles.chipTextActive,
                ]}
              >
                {wallet.name}
              </Text>
            </Pressable>
          ))}
      </View>

      {draft.kind === "fixed" ? (
        <>
          <Text style={styles.label}>DIA DE COBRO (1-31)</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => setDraft((current) => ({ ...current, day: value }))}
            placeholder="08"
            placeholderTextColor="#7C89A8"
            style={styles.input}
            value={draft.day}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>MES (YYYY-MM)</Text>
          <TextInput
            onChangeText={(value) => setDraft((current) => ({ ...current, month: value }))}
            placeholder="2026-08"
            placeholderTextColor="#7C89A8"
            style={styles.input}
            value={draft.month}
          />
        </>
      )}

      <Text style={styles.label}>NOTA</Text>
      <TextInput
        multiline
        onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))}
        placeholder="Opcional"
        placeholderTextColor="#7C89A8"
        style={[styles.input, styles.textArea]}
        value={draft.notes}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.submitAction,
          pressed && !isSubmitting && styles.pressed,
          isSubmitting && styles.submitActionDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#09111E" />
        ) : (
          <Text style={styles.submitActionText}>Guardar compromiso</Text>
        )}
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
  },
  softText: { color: theme.colors.grayLight, fontSize: 12, lineHeight: 18 },
  label: {
    color: theme.colors.grayLight,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minWidth: 74,
    minHeight: 40,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.blueSoft,
  },
  chipText: { color: theme.colors.grayLight, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: theme.colors.white },
  input: {
    minHeight: 46,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  errorText: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginTop: 10 },
  submitAction: {
    minHeight: 50,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    marginTop: 16,
  },
  submitActionDisabled: { opacity: 0.75 },
  submitActionText: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.88 },
});
