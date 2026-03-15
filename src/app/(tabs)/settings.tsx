import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Feather,
  Ionicons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  SettingsSheetStack,
  type SettingsDraft,
  type SettingsSheetKind,
  type WalletDraft,
} from "@/components/settings/settings-sheet-stack";
import { AppSwitch } from "@/components/ui/app-switch";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { clearPin, updateLockTimeout } from "@/lib/security/app-lock";
import {
  formatLockTimeout,
  type LockTimeoutMs,
} from "@/lib/security/security-preferences";
import { supabase } from "@/lib/supabase/client";
import { listCategories } from "@/modules/categories/service";
import type { Category } from "@/modules/categories/types";
import { listIncomeSources } from "@/modules/income-sources/service";
import type { IncomeSource } from "@/modules/income-sources/types";
import { updateSettings } from "@/modules/settings/service";
import {
  createWallet,
  deactivateWallet,
  updateWallet,
} from "@/modules/wallets/service";
import { createMockWallet } from "@/modules/wallets/types";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useSecurityStore } from "@/stores/security-store";

function Section({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  hint,
  onPress,
  showChevron = Boolean(onPress),
  title,
  value,
}: {
  hint?: string;
  onPress?: () => void;
  showChevron?: boolean;
  title: string;
  value?: string;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={styles.rowValueWrap}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {showChevron ? <Feather color="#7D89A8" name="chevron-right" size={16} /> : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [sheet, setSheet] = useState<SettingsSheetKind>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>({
    aiAnalysisFrequency: "manual",
    avgMonthsWithoutPayment: "0",
    dateFormat: "DD/MM/YYYY",
    financialMonthStartDay: "1",
    primaryCurrency: "USD",
    savingsGoalPercent: "20",
  });
  const [walletDraft, setWalletDraft] = useState<WalletDraft>({
    color: "#4F6BFF",
    currency: "USD",
    id: null,
    name: "",
  });

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const replaceLocalSettings = useAppStore((state) => state.replaceLocalSettings);
  const upsertLocalWallet = useAppStore((state) => state.upsertLocalWallet);
  const lockTimeoutMs = useSecurityStore((state) => state.lockTimeoutMs);
  const pinStatus = useSecurityStore((state) => state.pinStatus);

  const email = user?.email ?? "usuario@finflow.app";
  const displayName = email.split("@")[0] || "Usuario";
  const activeWallets = wallets.filter((wallet) => wallet.isActive);
  const isPinEnabled = pinStatus !== "not_setup";

  useEffect(() => {
    if (!settings) {
      return;
    }

    setSettingsDraft({
      aiAnalysisFrequency: settings.aiAnalysisFrequency,
      avgMonthsWithoutPayment: String(settings.avgMonthsWithoutPayment),
      dateFormat: settings.dateFormat,
      financialMonthStartDay: String(settings.financialMonthStartDay),
      primaryCurrency: settings.primaryCurrency,
      savingsGoalPercent: String(settings.savingsGoalPercent),
    });
  }, [settings]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void Promise.all([
      listCategories({ isDevBypass, userId: user.id }),
      listIncomeSources({ isDevBypass, userId: user.id }),
    ]).then(([nextCategories, nextIncomeSources]) => {
      setCategories(nextCategories);
      setIncomeSources(nextIncomeSources);
    });
  }, [isDevBypass, user?.id]);

  function closeSheet() {
    setSheet(null);
    setSheetError(null);
    setIsSubmitting(false);
  }

  function openPreferencesSheet() {
    if (settings) {
      setSettingsDraft({
        aiAnalysisFrequency: settings.aiAnalysisFrequency,
        avgMonthsWithoutPayment: String(settings.avgMonthsWithoutPayment),
        dateFormat: settings.dateFormat,
        financialMonthStartDay: String(settings.financialMonthStartDay),
        primaryCurrency: settings.primaryCurrency,
        savingsGoalPercent: String(settings.savingsGoalPercent),
      });
    }

    setSheetError(null);
    setSheet("preferences");
  }

  function openWalletSheet(walletId?: string) {
    const wallet = wallets.find((item) => item.id === walletId);

    setWalletDraft({
      color: wallet?.color ?? "#4F6BFF",
      currency: wallet?.currency ?? "USD",
      id: wallet?.id ?? null,
      name: wallet?.name ?? "",
    });
    setSheetError(null);
    setSheet("wallet");
  }

  async function handleSavePreferences() {
    if (!user?.id || !settings) {
      setSheetError("No hay sesion activa.");
      return;
    }

    const savingsGoalPercent = Number(settingsDraft.savingsGoalPercent);
    const financialMonthStartDay = Number(settingsDraft.financialMonthStartDay);
    const avgMonthsWithoutPayment = Number(settingsDraft.avgMonthsWithoutPayment);

    if (
      Number.isNaN(savingsGoalPercent) ||
      savingsGoalPercent < 0 ||
      savingsGoalPercent > 100
    ) {
      setSheetError("La meta de ahorro debe estar entre 0 y 100.");
      return;
    }

    if (
      Number.isNaN(financialMonthStartDay) ||
      financialMonthStartDay < 1 ||
      financialMonthStartDay > 31
    ) {
      setSheetError("El inicio del mes financiero debe estar entre 1 y 31.");
      return;
    }

    if (Number.isNaN(avgMonthsWithoutPayment) || avgMonthsWithoutPayment < 0) {
      setSheetError("Meses sin cobrar debe ser un numero valido.");
      return;
    }

    setIsSubmitting(true);
    setSheetError(null);

    try {
      if (isDevBypass) {
        replaceLocalSettings({
          ...settings,
          aiAnalysisFrequency: settingsDraft.aiAnalysisFrequency,
          avgMonthsWithoutPayment,
          dateFormat: settingsDraft.dateFormat,
          financialMonthStartDay,
          primaryCurrency: settingsDraft.primaryCurrency,
          savingsGoalPercent,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const nextSettings = await updateSettings({
          patch: {
            ai_analysis_frequency: settingsDraft.aiAnalysisFrequency,
            avg_months_without_payment: avgMonthsWithoutPayment,
            date_format: settingsDraft.dateFormat,
            financial_month_start_day: financialMonthStartDay,
            primary_currency: settingsDraft.primaryCurrency,
            savings_goal_percent: savingsGoalPercent,
          },
          userId: user.id,
        });

        replaceLocalSettings(nextSettings);
      }

      closeSheet();
    } catch (error) {
      setSheetError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las preferencias.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleSaveWallet() {
    if (!user?.id) {
      setSheetError("No hay sesion activa.");
      return;
    }

    const normalizedName = walletDraft.name.trim();
    const normalizedCurrency = walletDraft.currency.trim().toUpperCase();

    if (!normalizedName || !normalizedCurrency) {
      setSheetError("Escribe nombre y moneda para la wallet.");
      return;
    }

    setIsSubmitting(true);
    setSheetError(null);

    try {
      if (walletDraft.id) {
        if (isDevBypass) {
          const currentWallet = wallets.find((item) => item.id === walletDraft.id);

          if (!currentWallet) {
            throw new Error("Wallet no encontrada.");
          }

          upsertLocalWallet({
            ...currentWallet,
            color: walletDraft.color,
            currency: normalizedCurrency,
            name: normalizedName,
            updatedAt: new Date().toISOString(),
          });
        } else {
          const updatedWallet = await updateWallet({
            patch: {
              color: walletDraft.color,
              currency: normalizedCurrency,
              name: normalizedName,
            },
            userId: user.id,
            walletId: walletDraft.id,
          });

          upsertLocalWallet(updatedWallet);
        }
      } else if (isDevBypass) {
        upsertLocalWallet(
          createMockWallet({
            color: walletDraft.color,
            currency: normalizedCurrency,
            name: normalizedName,
            position: wallets.length,
            userId: user.id,
          }),
        );
      } else {
        const createdWallet = await createWallet({
          input: {
            color: walletDraft.color,
            currency: normalizedCurrency,
            name: normalizedName,
            position: wallets.length,
          },
          userId: user.id,
        });

        upsertLocalWallet(createdWallet);
      }

      closeSheet();
    } catch (error) {
      setSheetError(
        error instanceof Error ? error.message : "No se pudo guardar la wallet.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateWallet(walletId: string) {
    if (!user?.id || activeWallets.length <= 1) {
      return;
    }

    try {
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
      } else {
        const updatedWallet = await deactivateWallet({ userId: user.id, walletId });
        upsertLocalWallet(updatedWallet);
      }
    } catch {
      setSheetError("No se pudo desactivar la wallet.");
    }
  }

  async function handleSignOut() {
    if (isDevBypass) {
      clearAuth();
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
  }

  async function handleTogglePin(nextValue: boolean) {
    if (nextValue) {
      router.push("/pin");
      return;
    }

    try {
      await clearPin();
    } catch (error) {
      setSheetError(
        error instanceof Error ? error.message : "No se pudo desactivar el PIN.",
      );
    }
  }

  async function handleStartPinReset() {
    setIsSubmitting(true);
    setSheetError(null);

    try {
      await clearPin();
      closeSheet();
      router.push("/pin");
    } catch (error) {
      setSheetError(
        error instanceof Error ? error.message : "No se pudo reiniciar el PIN.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleSelectLockTimeout(nextLockTimeoutMs: LockTimeoutMs) {
    setIsSubmitting(true);
    setSheetError(null);

    try {
      await updateLockTimeout(nextLockTimeoutMs);
      closeSheet();
    } catch (error) {
      setSheetError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el tiempo de bloqueo.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        secondaryAction={{
          icon: "bell",
          onPress: () => router.push("/notifications"),
          showBadge: true,
        }}
        title="Ajustes"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
            <View style={styles.avatarBadge} />
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        <Section
          action={
            <Pressable onPress={() => openWalletSheet()} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.sectionAction}>+ Adicionar</Text>
            </Pressable>
          }
          title="Carteras"
        >
          {wallets.map((wallet) => (
            <View key={wallet.id} style={styles.walletRow}>
              <View style={[styles.walletGlyph, { borderColor: wallet.color ?? "#4F6BFF" }]}>
                <Ionicons color={wallet.color ?? "#4F6BFF"} name="wallet-outline" size={15} />
              </View>
              <View style={styles.walletText}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                <Text style={styles.walletMeta}>
                  {wallet.currency} • ${wallet.balance.toFixed(2)} •{" "}
                  {wallet.isActive ? "activa" : "archivada"}
                </Text>
              </View>
              <View style={styles.walletActions}>
                <Pressable onPress={() => openWalletSheet(wallet.id)} style={({ pressed }) => pressed && styles.pressed}>
                  <Feather color="#C5D0EA" name="edit-2" size={14} />
                </Pressable>
                {activeWallets.length > 1 && wallet.isActive ? (
                  <Pressable
                    onPress={() => {
                      void handleDeactivateWallet(wallet.id);
                    }}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Ionicons color="#D4DBF1" name="trash-outline" size={16} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </Section>

        <Section title="Finanzas personales">
          <Row
            hint="Porcentaje del ingreso total"
            onPress={openPreferencesSheet}
            title="Meta de ahorro mensual"
            value={`${settings?.savingsGoalPercent ?? "--"}%`}
          />
          <Row
            hint="Dia del mes para el reinicio del ciclo"
            onPress={openPreferencesSheet}
            title="Inicio del mes financiero"
            value={`${settings?.financialMonthStartDay ?? 1}st`}
          />
        </Section>

        <Section title="Apariencia">
          <Row
            onPress={openPreferencesSheet}
            title="Selector de moneda"
            value={`${settings?.primaryCurrency ?? "USD"} ($)`}
          />
          <Row
            onPress={openPreferencesSheet}
            title="Formato de fecha"
            value={settings?.dateFormat ?? "DD/MM/YYYY"}
          />
        </Section>

        <Section title="Configuracion de IA">
          <Row
            onPress={openPreferencesSheet}
            title="Analysis Frequency"
            value={
              settings?.aiAnalysisFrequency === "daily"
                ? "Daily"
                : settings?.aiAnalysisFrequency === "each_transaction"
                  ? "Each Tx"
                  : "Manual"
            }
          />
        </Section>

        <Section title="Seguridad">
          <View style={styles.securityRow}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>PIN</Text>
              <Text style={styles.rowHint}>
                Protege la app al volver desde segundo plano.
              </Text>
            </View>
            <AppSwitch onValueChange={(value) => void handleTogglePin(value)} value={isPinEnabled} />
          </View>
          <Row
            hint="Restablece el PIN actual y vuelve a configurarlo"
            onPress={isPinEnabled ? () => setSheet("pin") : undefined}
            showChevron={isPinEnabled}
            title="Cambiar PIN"
            value={isPinEnabled ? "Activo" : "No configurado"}
          />
          <Row
            hint="Tiempo antes de volver a pedir el PIN"
            onPress={() => setSheet("lock_time")}
            title="Lock Time"
            value={formatLockTimeout(lockTimeoutMs)}
          />
        </Section>

        <Section title="Gestion de datos">
          <Row
            hint="Editar categorias de gastos"
            onPress={() => setSheet("libraries")}
            title="Gestion de categorias"
            value={String(categories.length)}
          />
          <Row
            hint="Gestion tu salario y trabajos secundarios"
            onPress={() => setSheet("libraries")}
            title="Fuentes de ingresos"
            value={String(incomeSources.length)}
          />
        </Section>

        <Pressable
          onPress={() => {
            void handleSignOut();
          }}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          <Text style={styles.signOutText}>Cerrar sesion</Text>
        </Pressable>
      </ScrollView>

      <SettingsSheetStack
        categories={categories}
        incomeSources={incomeSources}
        isSubmitting={isSubmitting}
        lockTimeoutMs={lockTimeoutMs}
        onClose={closeSheet}
        onSelectLockTimeout={(value) => void handleSelectLockTimeout(value)}
        onStartPinReset={() => void handleStartPinReset()}
        onSubmitPreferences={() => void handleSavePreferences()}
        onSubmitWallet={() => void handleSaveWallet()}
        pinEnabled={isPinEnabled}
        setSettingsDraft={setSettingsDraft}
        setWalletDraft={setWalletDraft}
        settings={settings}
        settingsDraft={settingsDraft}
        sheet={sheet}
        sheetError={sheetError}
        walletDraft={walletDraft}
        wallets={wallets}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1020" },
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 104, gap: 16 },
  profileCard: { alignItems: "center", gap: 6, paddingTop: 4 },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: "#4B69FF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18213A",
  },
  avatarText: { color: "#F8FAFC", fontSize: 28, fontWeight: "900" },
  avatarBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#0B1020",
    backgroundColor: "#4B69FF",
  },
  profileName: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  profileEmail: { color: "#8A96B3", fontSize: 13 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  sectionAction: { color: "#4B69FF", fontSize: 12, fontWeight: "800" },
  sectionBody: {
    borderRadius: 14,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
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
  walletName: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  walletMeta: { color: "#8A96B3", fontSize: 11, lineHeight: 16 },
  walletActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(88, 104, 149, 0.12)",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
  rowHint: { color: "#8A96B3", fontSize: 11, lineHeight: 16 },
  rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { color: "#4B69FF", fontSize: 12, fontWeight: "800" },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(88, 104, 149, 0.12)",
  },
  rowMuted: { color: "#8A96B3", fontSize: 12, fontWeight: "700" },
  signOutButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
  },
  signOutText: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.88 },
});
