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
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/modules/categories/service";
import type { Category } from "@/modules/categories/types";
import { useAuthStore } from "@/stores/auth-store";
import { theme } from "@/utils/theme";

const categoryColors = ["#4F6BFF", "#18B7A4", "#F97316", "#E11D48", "#22C55E"] as const;

type AlertState = {
  confirmLabel?: string;
  message: string;
  onConfirm?: () => void;
  title: string;
  visible: boolean;
};

export default function CategorySettingsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4F6BFF");
  const [error, setError] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<AlertState>({
    message: "",
    title: "",
    visible: false,
  });

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const editing = useMemo(
    () => categories.find((item) => item.id === editingId) ?? null,
    [categories, editingId],
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void listCategories({ isDevBypass, userId: user.id }).then(setCategories);
  }, [isDevBypass, user?.id]);

  function openCreate() {
    setEditingId(null);
    setName("");
    setColor("#4F6BFF");
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setColor(category.color);
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
      setError("Escribe un nombre para la categoria.");
      return;
    }

    try {
      if (isDevBypass) {
        if (editing) {
          setCategories((current) =>
            current.map((item) =>
              item.id === editing.id ? { ...item, color, name: normalizedName } : item,
            ),
          );
        } else {
          const now = new Date().toISOString();
          setCategories((current) => [
            ...current,
            {
              color,
              createdAt: now,
              icon: "shapes",
              id: `local-category-${Date.now()}`,
              isDefault: false,
              name: normalizedName,
              userId: user.id,
            },
          ]);
        }
      } else if (editing) {
        const updated = await updateCategory({
          categoryId: editing.id,
          patch: { color, name: normalizedName },
          userId: user.id,
        });
        setCategories((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await createCategory({
          color,
          icon: "shapes",
          name: normalizedName,
          userId: user.id,
        });
        setCategories((current) => [...current, created]);
      }

      closeSheet();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "No se pudo guardar la categoria.",
      );
    }
  }

  async function handleDelete(id: string) {
    if (!user?.id) {
      return;
    }

    try {
      if (isDevBypass) {
        setCategories((current) => current.filter((item) => item.id !== id));
      } else {
        await deleteCategory({ categoryId: id, userId: user.id });
        setCategories((current) => current.filter((item) => item.id !== id));
      }
    } catch (caughtError) {
      showInfo(
        "No se pudo eliminar",
        caughtError instanceof Error
          ? caughtError.message
          : "La categoria tiene referencias y no puede eliminarse.",
      );
    }
  }

  function confirmDelete(category: Category) {
    setAlertState({
      confirmLabel: "Eliminar",
      message: `Se eliminara la categoria "${category.name}".`,
      onConfirm: () => {
        void handleDelete(category.id);
      },
      title: "Eliminar categoria",
      visible: true,
    });
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        primaryAction={{ icon: "plus", onPress: openCreate }}
        title="Categorías"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {categories.map((category) => (
            <View key={category.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <Text style={styles.name}>{category.name}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => openEdit(category)} style={({ pressed }) => pressed && styles.pressed}>
                  <Ionicons color={theme.colors.white} name="create-outline" size={17} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(category)} style={({ pressed }) => pressed && styles.pressed}>
                  <Ionicons color={theme.colors.grayLight} name="trash-outline" size={17} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheet onClose={closeSheet} visible={sheetOpen}>
        <Text style={styles.sheetTitle}>{editing ? "Editar categoria" : "Nueva categoria"}</Text>
        <Text style={styles.sheetDescription}>Gestiona tus categorias personales por usuario.</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          onChangeText={setName}
          placeholder="Ej: Salud"
          placeholderTextColor={theme.colors.grayLight}
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {categoryColors.map((item) => (
            <Pressable
              key={item}
              onPress={() => setColor(item)}
              style={({ pressed }) => [
                styles.colorSwatch,
                { backgroundColor: item },
                color === item && styles.colorSwatchActive,
                pressed && styles.pressed,
              ]}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={() => void handleSave()} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}>
          <Text style={styles.submitButtonText}>{editing ? "Guardar categoria" : "Crear categoria"}</Text>
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
  dot: { width: 10, height: 10, borderRadius: 999 },
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
  colorRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  colorSwatch: { width: 34, height: 34, borderRadius: 999, borderWidth: 2, borderColor: "transparent" },
  colorSwatchActive: { borderColor: theme.colors.white },
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
