import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { createWallet, deactivateWallet, updateWallet } from "@/modules/wallets/service";
import { createMockWallet } from "@/modules/wallets/types";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { theme } from "@/utils/theme";

const walletColors = ["#4F6BFF", "#18B7A4", "#F97316", "#E11D48"] as const;

export default function WalletSettingsScreen() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [color, setColor] = useState("#4F6BFF");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const wallets = useAppStore((state) => state.wallets);
  const upsertLocalWallet = useAppStore((state) => state.upsertLocalWallet);
  const activeWallets = wallets.filter((wallet) => wallet.isActive);
  const editingWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === editingWalletId) ?? null,
    [editingWalletId, wallets],
  );

  function openCreateSheet() {
    setEditingWalletId(null);
    setName("");
    setCurrency("USD");
    setColor("#4F6BFF");
    setError(null);
    setIsSubmitting(false);
    setSheetOpen(true);
  }

  function openEditSheet(walletId: string) {
    const wallet = wallets.find((item) => item.id === walletId);
    if (!wallet) {
      return;
    }

    setEditingWalletId(wallet.id);
    setName(wallet.name);
    setCurrency(wallet.currency);
    setColor(wallet.color ?? "#4F6BFF");
    setError(null);
    setIsSubmitting(false);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setError(null);
    setIsSubmitting(false);
  }

  async function handleSaveWallet() {
    if (!user?.id) {
      setError("No hay sesion activa.");
      return;
    }

    const normalizedName = name.trim();
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!normalizedName || !normalizedCurrency) {
      setError("Escribe nombre y moneda para la wallet.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingWallet) {
        if (isDevBypass) {
          upsertLocalWallet({
            ...editingWallet,
            color,
            currency: normalizedCurrency,
            name: normalizedName,
            updatedAt: new Date().toISOString(),
          });
        } else {
          const updatedWallet = await updateWallet({
            patch: {
              color,
              currency: normalizedCurrency,
              name: normalizedName,
            },
            userId: user.id,
            walletId: editingWallet.id,
          });
          upsertLocalWallet(updatedWallet);
        }
      } else if (isDevBypass) {
        upsertLocalWallet(
          createMockWallet({
            color,
            currency: normalizedCurrency,
            name: normalizedName,
            position: wallets.length,
            userId: user.id,
          }),
        );
      } else {
        const createdWallet = await createWallet({
          input: {
            color,
            currency: normalizedCurrency,
            name: normalizedName,
            position: wallets.length,
          },
          userId: user.id,
        });
        upsertLocalWallet(createdWallet);
      }

      closeSheet();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "No se pudo guardar la wallet.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateWallet(walletId: string) {
    if (!user?.id || activeWallets.length <= 1) {
      return;
    }

    if (isDevBypass) {
      const wallet = wallets.find((item) => item.id === walletId);
      if (!wallet) {
        return;
      }
      upsertLocalWallet({
        ...wallet,
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const updatedWallet = await deactivateWallet({ userId: user.id, walletId });
    upsertLocalWallet(updatedWallet);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        primaryAction={{ icon: "plus", onPress: openCreateSheet }}
        title="Wallets"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {wallets.map((wallet) => (
            <View key={wallet.id} style={styles.walletRow}>
              <View style={[styles.walletGlyph, { borderColor: wallet.color ?? "#4F6BFF" }]}>
                <Ionicons color={wallet.color ?? "#4F6BFF"} name="wallet-outline" size={15} />
              </View>
              <View style={styles.walletText}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                <Text style={styles.walletMeta}>
                  {wallet.currency} - ${wallet.balance.toFixed(2)} -{" "}
                  {wallet.isActive ? "activa" : "archivada"}
                </Text>
              </View>
              <View style={styles.walletActions}>
                <Pressable
                  onPress={() => openEditSheet(wallet.id)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Ionicons color={theme.colors.white} name="create-outline" size={17} />
                </Pressable>
                {activeWallets.length > 1 && wallet.isActive ? (
                  <Pressable
                    onPress={() => {
                      void handleDeactivateWallet(wallet.id);
                    }}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Ionicons color={theme.colors.grayLight} name="trash-outline" size={17} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheet onClose={closeSheet} visible={sheetOpen}>
        <Text style={styles.sheetTitle}>{editingWallet ? "Editar wallet" : "Nueva wallet"}</Text>
        <Text style={styles.sheetDescription}>
          Puedes usar varias wallets activas y mover dinero entre ellas.
        </Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          onChangeText={setName}
          placeholder="Ej: Banco USD"
          placeholderTextColor={theme.colors.grayLight}
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>Moneda</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={(value) => setCurrency(value.toUpperCase())}
          placeholder="USD"
          placeholderTextColor={theme.colors.grayLight}
          style={styles.input}
          value={currency}
        />

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {walletColors.map((item) => (
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

        <Pressable
          onPress={() => {
            void handleSaveWallet();
          }}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.pressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Guardando..." : editingWallet ? "Guardar wallet" : "Crear wallet"}
          </Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.sm + 4,
    paddingTop: theme.spacing.xs + 2,
    paddingBottom: 104,
    gap: theme.spacing.md,
  },
  section: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
    overflow: "hidden",
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(88, 104, 149, 0.12)",
  },
  walletGlyph: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(33, 43, 74, 0.82)",
  },
  walletText: { flex: 1, gap: 2 },
  walletName: { color: theme.colors.white, fontSize: 14, fontWeight: "800" },
  walletMeta: { color: theme.colors.grayLight, fontSize: 11, lineHeight: 16 },
  walletActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  sheetTitle: {
    color: theme.colors.white,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  sheetDescription: {
    color: theme.colors.grayLight,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  label: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(92, 108, 149, 0.24)",
    backgroundColor: "#192035",
    color: theme.colors.white,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  colorRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: theme.radii.pill,
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorSwatchActive: { borderColor: theme.colors.white },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: theme.colors.white, fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.88 },
});
