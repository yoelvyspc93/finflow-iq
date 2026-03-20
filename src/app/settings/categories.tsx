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
import { AppSwitch } from "@/components/ui/app-switch";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  createCategory,
  deleteCategory,
  getCategoryReferenceSummary,
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [referenceMap, setReferenceMap] = useState<Record<string, { totalReferences: number }>>({});
  const [alertState, setAlertState] = useState<AlertState>({
    message: "",
    title: "",
    visible: false,
  });

  const user = useAuthStore((state) => state.user);
  const editing = useMemo(
    () => categories.find((item) => item.id === editingId) ?? null,
    [categories, editingId],
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void listCategories({ includeInactive: true, userId: user.id }).then(setCategories);
  }, [user?.id]);

  useEffect(() => {
    if (!categories.length) {
      setReferenceMap({});
      return;
    }

    if (!user?.id) {
      setReferenceMap(
        Object.fromEntries(categories.map((category) => [category.id, { totalReferences: 1 }])),
      );
      return;
    }

    void Promise.allSettled(
      categories.map(async (category) => ({
        categoryId: category.id,
        summary: await getCategoryReferenceSummary({
          categoryId: category.id,
          userId: user.id,
        }),
      })),
    ).then((results) => {
      const next = Object.fromEntries(
        results.map((result, index) => {
          if (result.status === "fulfilled") {
            return [result.value.categoryId, result.value.summary];
          }

          return [categories[index]?.id ?? `category-${index}`, { totalReferences: 1 }];
        }),
      );

      setReferenceMap(next);
    });
  }, [categories, user?.id]);

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
      if (editing) {
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
      await deleteCategory({ categoryId: id, userId: user.id });
      setCategories((current) => current.filter((item) => item.id !== id));
    } catch (caughtError) {
      showInfo(
        "No se pudo eliminar",
        caughtError instanceof Error
          ? caughtError.message
          : "La categoria tiene referencias y no puede eliminarse. Desactívala con el switch.",
      );
    }
  }

  async function handleToggleActive(category: Category, nextValue: boolean) {
    if (!user?.id) {
      return;
    }

    setUpdatingId(category.id);

    try {
      const updated = await updateCategory({
        categoryId: category.id,
        patch: { isActive: nextValue },
        userId: user.id,
      });
      setCategories((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (caughtError) {
      showInfo(
        "No se pudo actualizar",
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo cambiar el estado de la categoria.",
      );
    } finally {
      setUpdatingId(null);
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
            <View
              key={category.id}
              style={[styles.row, !category.isActive && styles.rowInactive]}
            >
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <View style={styles.meta}>
                <Text style={[styles.name, !category.isActive && styles.nameInactive]}>
                  {category.name}
                </Text>
                {!category.isActive ? (
                  <Text style={styles.status}>Inactiva</Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <AppSwitch
                  disabled={updatingId === category.id}
                  onValueChange={(value) => {
                    void handleToggleActive(category, value);
                  }}
                  value={category.isActive}
                />
                {referenceMap[category.id]?.totalReferences === 0 ? (
                  <Pressable onPress={() => confirmDelete(category)} style={({ pressed }) => pressed && styles.pressed}>
                    <Ionicons color={theme.colors.grayLight} name="trash-outline" size={17} />
                  </Pressable>
                ) : null}
                <Pressable onPress={() => openEdit(category)} style={({ pressed }) => pressed && styles.pressed}>
                  <Ionicons color={theme.colors.white} name="create-outline" size={17} />
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
  rowInactive: {
    opacity: 0.72,
  },
  dot: { width: 10, height: 10, borderRadius: 999 },
  meta: { flex: 1, gap: 2 },
  name: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  nameInactive: { color: theme.colors.grayLight },
  status: { color: theme.colors.grayLight, fontSize: 11, fontWeight: "700" },
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
