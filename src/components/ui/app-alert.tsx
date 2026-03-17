import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/utils/theme";

type AppAlertProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  title: string;
  visible: boolean;
};

export function AppAlert({
  cancelLabel = "Cancelar",
  confirmLabel = "Aceptar",
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: AppAlertProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            {onConfirm ? (
              <Pressable onPress={onConfirm} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.18)",
    backgroundColor: "#12172B",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  message: {
    color: theme.colors.grayLight,
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
  },
  cancelButton: {
    minHeight: 40,
    minWidth: 96,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    backgroundColor: "#192035",
  },
  cancelText: {
    color: theme.colors.grayLight,
    fontSize: 13,
    fontWeight: "700",
  },
  confirmButton: {
    minHeight: 40,
    minWidth: 96,
    borderRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },
  confirmText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.88,
  },
});

