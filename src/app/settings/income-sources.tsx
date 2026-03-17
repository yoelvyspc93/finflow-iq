import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppAlert } from "@/components/ui/app-alert";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  createIncomeSource,
  deleteIncomeSource,
  listIncomeSources,
  updateIncomeSource,
} from "@/modules/income-sources/service";
import type { IncomeSource } from "@/modules/income-sources/types";
import { useAuthStore } from "@/stores/auth-store";
import { theme } from "@/utils/theme";

type AlertState = {
  confirmLabel?: string;
  message: string;
  onConfirm?: () => void;
  title: string;
  visible: boolean;
};

export default function IncomeSourceSettingsScreen() {
  const router = useRouter();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<AlertState>({
    message: "",
    title: "",
    visible: false,
  });

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const editing = useMemo(
    () => incomeSources.find((item) => item.id === editingId) ?? null,
    [editingId, incomeSources],
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void listIncomeSources({ isDevBypass, userId: user.id }).then(setIncomeSources);
  }, [isDevBypass, user?.id]);

  function openCreate() {
    setEditingId(null);
    setName("");
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: IncomeSource) {
    setEditingId(item.id);
    setName(item.name);
    setError(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setError(null);
  }

  function showInfo(title: string, message: string) {
    setAlertState({
      message,
      title,
      visible: true,
    });
  }

  function closeAlert() {
    setAlertState({
      message: "",
      title: "",
      visible: false,
    });
  }

  function confirmAlert() {
    const action = alertState.onConfirm;
    closeAlert();
    action?.();
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Escribe un nombre para la fuente.");
      return;
    }

    try {
      if (isDevBypass) {
        if (editing) {
          setIncomeSources((current) =>
            current.map((item) => (item.id === editing.id ? { ...item, name: normalizedName } : item)),
          );
        } else {
          const now = new Date().toISOString();
          setIncomeSources((current) => [
            ...current,
            {
              createdAt: now,
              id: `local-income-source-${Date.now()}`,
              isDefault: false,
              name: normalizedName,
              userId: user.id,
            },
          ]);
        }
      } else if (editing) {
        const updated = await updateIncomeSource({
          incomeSourceId: editing.id,
          patch: { name: normalizedName },
          userId: user.id,
        });
        setIncomeSources((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await createIncomeSource({ name: normalizedName, userId: user.id });
        setIncomeSources((current) => [...current, created]);
      }

      closeSheet();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo guardar la fuente de ingreso.",
      );
    }
  }

  async function handleDelete(id: string) {
    if (!user?.id) {
      return;
    }

    try {
      if (isDevBypass) {
        setIncomeSources((current) => current.filter((item) => item.id !== id));
      } else {
        await deleteIncomeSource({ incomeSourceId: id, userId: user.id });
        setIncomeSources((current) => current.filter((item) => item.id !== id));
      }
    } catch (caughtError) {
      showInfo(
        "No se pudo eliminar",
        caughtError instanceof Error
          ? caughtError.message
          : "La fuente tiene referencias y no puede eliminarse.",
      );
    }
  }

  function confirmDelete(source: IncomeSource) {
    setAlertState({
      confirmLabel: "Eliminar",
      message: `Se eliminara la fuente "${source.name}".`,
      onConfirm: () => {
        void handleDelete(source.id);
      },
      title: "Eliminar fuente de ingreso",
      visible: true,
    });
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        primaryAction={{ icon: "plus", onPress: openCreate }}
        title="Fuentes de ingreso"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {incomeSources.map((source) => (
            <View key={source.id} style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.name}>{source.name}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => openEdit(source)} style={({ pressed }) => pressed && styles.pressed}>
                  <Ionicons color={theme.colors.white} name="create-outline" size={17} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(source)} style={({ pressed }) => pressed && styles.pressed}>
                  <Ionicons color={theme.colors.grayLight} name="trash-outline" size={17} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheet onClose={closeSheet} visible={sheetOpen}>
        <Text style={styles.sheetTitle}>
          {editing ? "Editar fuente de ingreso" : "Nueva fuente de ingreso"}
        </Text>
        <Text style={styles.sheetDescription}>
          Gestiona tus fuentes de ingreso personales por usuario.
        </Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          onChangeText={setName}
          placeholder="Ej: Bonus"
          placeholderTextColor={theme.colors.grayLight}
          style={styles.input}
          value={name}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={() => void handleSave()} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}>
          <Text style={styles.submitButtonText}>
            {editing ? "Guardar fuente" : "Crear fuente"}
          </Text>
        </Pressable>
      </BottomSheet>

      <AppAlert
        cancelLabel="Cancelar"
        confirmLabel={alertState.confirmLabel ?? "Aceptar"}
        message={alertState.message}
        onCancel={closeAlert}
        onConfirm={alertState.onConfirm ? confirmAlert : undefined}
        title={alertState.title}
        visible={alertState.visible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg, gap: theme.spacing.lg },
  section: {
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: theme.colors.grayLight },
  name: { flex: 1, color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetTitle: { color: theme.colors.white, fontSize: 22, fontWeight: "700", marginBottom: 8 },
  sheetDescription: { color: theme.colors.grayLight, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  label: { color: theme.colors.white, fontSize: 14, fontWeight: "700", marginBottom: 8, marginTop: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  errorText: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginTop: 12 },
  submitButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  submitButtonText: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.88 },
});
