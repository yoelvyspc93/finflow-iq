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
import type { GoalProgressSnapshot } from "@/modules/goals/calculations";
import type { Wallet } from "@/modules/wallets/types";

export type PlanningSheetKind = "goal" | "contribution" | "wish" | null;

export type GoalDraft = {
  deadline: string;
  name: string;
  targetAmount: string;
  walletId: string;
};

export type ContributionDraft = {
  amount: string;
  date: string;
  goalId: string;
  note: string;
};

export type WishDraft = {
  amount: string;
  name: string;
  notes: string;
  priority: string;
  walletId: string;
};

type PlanningSheetStackProps = {
  activeGoals: GoalProgressSnapshot[];
  contributionDraft: ContributionDraft;
  goalDraft: GoalDraft;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitContribution: () => void;
  onSubmitGoal: () => void;
  onSubmitWish: () => void;
  setContributionDraft: Dispatch<SetStateAction<ContributionDraft>>;
  setGoalDraft: Dispatch<SetStateAction<GoalDraft>>;
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
  activeGoals,
  contributionDraft,
  goalDraft,
  isSubmitting,
  onClose,
  onSubmitContribution,
  onSubmitGoal,
  onSubmitWish,
  setContributionDraft,
  setGoalDraft,
  setWishDraft,
  sheet,
  sheetError,
  wallets,
  wishDraft,
}: PlanningSheetStackProps) {
  const activeWallets = wallets.filter((wallet) => wallet.isActive);

  return (
    <>
      <BottomSheet onClose={onClose} visible={sheet === "goal"}>
        <Text style={styles.sheetTitle}>Nueva meta</Text>
        <Text style={styles.sheetDescription}>
          Define un objetivo de ahorro con wallet, monto y fecha limite opcional.
        </Text>

        <FieldLabel label="Nombre" />
        <TextInput
          onChangeText={(value) =>
            setGoalDraft((current) => ({ ...current, name: value }))
          }
          placeholder="Ej: Fondo de emergencia"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={goalDraft.name}
        />

        <FieldLabel label="Monto objetivo" />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            setGoalDraft((current) => ({ ...current, targetAmount: value }))
          }
          placeholder="2500"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={goalDraft.targetAmount}
        />

        <FieldLabel hint="Formato YYYY-MM-DD" label="Deadline opcional" />
        <TextInput
          onChangeText={(value) =>
            setGoalDraft((current) => ({ ...current, deadline: value }))
          }
          placeholder="2026-12-31"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={goalDraft.deadline}
        />

        <FieldLabel label="Wallet" />
        <View style={styles.chipRow}>
          {activeWallets.map((wallet) => (
            <ChipButton
              key={wallet.id}
              active={goalDraft.walletId === wallet.id}
              label={`${wallet.name} · ${wallet.currency}`}
              onPress={() =>
                setGoalDraft((current) => ({ ...current, walletId: wallet.id }))
              }
            />
          ))}
        </View>

        {sheetError ? <Text style={styles.errorText}>{sheetError}</Text> : null}

        <Pressable
          disabled={isSubmitting}
          onPress={onSubmitGoal}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#08111F" />
          ) : (
            <Text style={styles.submitButtonText}>Guardar meta</Text>
          )}
        </Pressable>
      </BottomSheet>

      <BottomSheet onClose={onClose} visible={sheet === "contribution"}>
        <Text style={styles.sheetTitle}>Registrar aporte</Text>
        <Text style={styles.sheetDescription}>
          Cada aporte crea una contribucion y un movimiento `goal_deposit`.
        </Text>

        <FieldLabel label="Meta" />
        <View style={styles.chipRow}>
          {activeGoals.map((snapshot) => (
            <ChipButton
              key={snapshot.goal.id}
              active={contributionDraft.goalId === snapshot.goal.id}
              label={snapshot.goal.name}
              onPress={() =>
                setContributionDraft((current) => ({
                  ...current,
                  goalId: snapshot.goal.id,
                }))
              }
            />
          ))}
        </View>

        <FieldLabel label="Monto" />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            setContributionDraft((current) => ({ ...current, amount: value }))
          }
          placeholder="100"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={contributionDraft.amount}
        />

        <FieldLabel hint="Formato YYYY-MM-DD" label="Fecha" />
        <TextInput
          onChangeText={(value) =>
            setContributionDraft((current) => ({ ...current, date: value }))
          }
          placeholder="2026-03-15"
          placeholderTextColor="#64748B"
          style={styles.sheetInput}
          value={contributionDraft.date}
        />

        <FieldLabel hint="Opcional" label="Nota" />
        <TextInput
          multiline
          onChangeText={(value) =>
            setContributionDraft((current) => ({ ...current, note: value }))
          }
          placeholder="Aporte del cierre quincenal"
          placeholderTextColor="#64748B"
          style={[styles.sheetInput, styles.sheetTextArea]}
          value={contributionDraft.note}
        />

        {sheetError ? <Text style={styles.errorText}>{sheetError}</Text> : null}

        <Pressable
          disabled={isSubmitting}
          onPress={onSubmitContribution}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#08111F" />
          ) : (
            <Text style={styles.submitButtonText}>Registrar aporte</Text>
          )}
        </Pressable>
      </BottomSheet>

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

        <FieldLabel hint="1 es la maxima prioridad" label="Prioridad" />
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

        <FieldLabel label="Wallet" />
        <View style={styles.chipRow}>
          {activeWallets.map((wallet) => (
            <ChipButton
              key={wallet.id}
              active={wishDraft.walletId === wallet.id}
              label={`${wallet.name} · ${wallet.currency}`}
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
    </>
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
