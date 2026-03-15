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
  SettingsSheetStack,
  type SettingsDraft,
  type SettingsSheetKind,
  type WalletDraft,
} from "@/components/settings/settings-sheet-stack";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
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

function SectionRow({
  hint,
  onPress,
  title,
  value,
}: {
  hint?: string;
  onPress?: () => void;
  title: string;
  value?: string;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionRow,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.sectionRowText}>
        <Text style={styles.sectionRowTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionRowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.sectionRowValue}>{value ?? ">"}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
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
  const pinStatus = useSecurityStore((state) => state.pinStatus);

  const email = user?.email ?? "usuario@finflow.app";
  const displayName = email.split("@")[0] || "Usuario";
  const activeWallets = wallets.filter((wallet) => wallet.isActive);

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

    if (!normalizedName) {
      setSheetError("Escribe un nombre para la wallet.");
      return;
    }

    if (!normalizedCurrency) {
      setSheetError("Escribe la moneda de la wallet.");
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

    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.border} />
      <ScreenHeader title="Ajustes" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
            <View style={styles.avatarBadge} />
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Carteras</Text>
            <Pressable
              onPress={() => openWalletSheet()}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.sectionAction}>+ Anadir</Text>
            </Pressable>
          </View>
          {wallets.map((wallet) => (
            <View key={wallet.id} style={styles.walletRow}>
              <View style={styles.walletGlyph}>
                <Text style={styles.walletGlyphText}>□</Text>
              </View>
              <View style={styles.walletText}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                <Text style={styles.walletMeta}>
                  {wallet.currency} • {wallet.balance.toFixed(2)} •{" "}
                  {wallet.isActive ? "activa" : "archivada"}
                </Text>
              </View>
              <View style={styles.walletActionsRow}>
                <Pressable
                  onPress={() => openWalletSheet(wallet.id)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.walletActionText}>Editar</Text>
                </Pressable>
                {activeWallets.length > 1 && wallet.isActive ? (
                  <Pressable
                    onPress={() => {
                      void handleDeactivateWallet(wallet.id);
                    }}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.walletActionDanger}>Archivar</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finanzas personales</Text>
          <SectionRow
            hint="Porcentaje del ingreso total"
            onPress={openPreferencesSheet}
            title="Meta de ahorro mensual"
            value={`${settings?.savingsGoalPercent ?? "--"}%`}
          />
          <SectionRow
            hint="Dia del mes para el reinicio del ciclo"
            onPress={openPreferencesSheet}
            title="Inicio del mes financiero"
            value={String(settings?.financialMonthStartDay ?? 1)}
          />
          <SectionRow
            hint="Promedio de meses con retrasos salariales"
            onPress={openPreferencesSheet}
            title="Meses sin cobrar"
            value={String(settings?.avgMonthsWithoutPayment ?? 0)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          <SectionRow
            onPress={openPreferencesSheet}
            title="Moneda principal"
            value={settings?.primaryCurrency ?? "USD"}
          />
          <SectionRow
            onPress={openPreferencesSheet}
            title="Formato de fecha"
            value={settings?.dateFormat ?? "DD/MM/YYYY"}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuracion de IA</Text>
          <SectionRow
            onPress={openPreferencesSheet}
            title="Analysis Frequency"
            value={settings?.aiAnalysisFrequency ?? "manual"}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <SectionRow
            title="PIN local"
            value={pinStatus === "not_setup" ? "Off" : "On"}
          />
          <SectionRow title="Cambio de PIN" value="Desde pantalla PIN" />
          <SectionRow title="Bloqueo" value="Inmediato" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestion de datos</Text>
          <SectionRow
            hint="Categorias visibles en toda la app"
            onPress={() => setSheet("libraries")}
            title="Categorias"
            value={String(categories.length)}
          />
          <SectionRow
            hint="Fuentes usadas en ingresos y salario"
            onPress={() => setSheet("libraries")}
            title="Fuentes de ingresos"
            value={String(incomeSources.length)}
          />
        </View>

        <Pressable
          onPress={() => {
            void handleSignOut();
          }}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
          ]}
        >
          <Text style={styles.signOutButtonText}>Cerrar sesion</Text>
        </Pressable>
      </ScrollView>

      <SettingsSheetStack
        categories={categories}
        incomeSources={incomeSources}
        isSubmitting={isSubmitting}
        onClose={closeSheet}
        onSubmitPreferences={() => {
          void handleSavePreferences();
        }}
        onSubmitWallet={() => {
          void handleSaveWallet();
        }}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1020",
  },
  border: {
    position: "absolute",
    top: 61,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.09)",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 18,
  },
  profileCard: {
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: "#4562FF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18213A",
  },
  avatarText: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "900",
  },
  avatarBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#0A1020",
    backgroundColor: "#4562FF",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  profileEmail: {
    color: "#8D98B2",
    fontSize: 14,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  sectionAction: {
    color: "#4562FF",
    fontSize: 13,
    fontWeight: "700",
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "#141D32",
    padding: 14,
  },
  walletGlyph: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(69, 98, 255, 0.14)",
  },
  walletGlyphText: {
    color: "#4562FF",
    fontSize: 14,
    fontWeight: "800",
  },
  walletText: {
    flex: 1,
    gap: 4,
  },
  walletName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  walletMeta: {
    color: "#8D98B2",
    fontSize: 12,
  },
  walletActionsRow: {
    alignItems: "flex-end",
    gap: 6,
  },
  walletActionText: {
    color: "#D7E3FA",
    fontSize: 12,
    fontWeight: "700",
  },
  walletActionDanger: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "#141D32",
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  sectionRowText: {
    flex: 1,
    gap: 3,
  },
  sectionRowTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionRowHint: {
    color: "#8D98B2",
    fontSize: 11,
    lineHeight: 16,
  },
  sectionRowValue: {
    color: "#4562FF",
    fontSize: 13,
    fontWeight: "800",
  },
  signOutButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2236",
    marginTop: 4,
  },
  signOutButtonPressed: {
    opacity: 0.88,
  },
  signOutButtonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.88,
  },
});
