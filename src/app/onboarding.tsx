import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { Redirect, router } from "expo-router";

import {
  OnboardingForm,
  type OnboardingFormValues,
} from "@/components/onboarding/onboarding-form";
import { AppLoadingScreen } from "@/components/app/app-loading-screen";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import {
  createMockSettings,
  type AppSettings,
} from "@/modules/settings/types";
import { updateSettings } from "@/modules/settings/service";
import { createWallet } from "@/modules/wallets/service";
import { createMockWallet } from "@/modules/wallets/types";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";

function buildUpdatedSettings(
  baseSettings: AppSettings,
  values: OnboardingFormValues,
): AppSettings {
  return {
    ...baseSettings,
    dateFormat: values.dateFormat,
    savingsGoalPercent: values.savingsGoalPercent,
    updatedAt: new Date().toISOString(),
  };
}

export default function OnboardingScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guard = useOnboardingGuard();
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const applyLocalAppData = useAppStore((state) => state.applyLocalAppData);
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const settings = useAppStore((state) => state.settings);

  if (guard.isLoading) {
    return <AppLoadingScreen message={guard.loadingMessage} />;
  }

  if (guard.redirectTo) {
    return <Redirect href={guard.redirectTo} />;
  }

  if (!guard.requiresOnboarding) {
    return <Redirect href="/dashboard" />;
  }

  async function handleSubmit(values: OnboardingFormValues) {
    if (!user?.id) {
      setSubmitError("No hay una sesion activa para completar el onboarding.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const baseSettings = settings ?? createMockSettings(user.id);

    try {
      if (isDevBypass) {
        const localSettings = buildUpdatedSettings(baseSettings, values);
        const wallet = createMockWallet({
          color: values.walletColor,
          currency: values.walletCurrency,
          name: values.walletName,
          userId: user.id,
        });

        applyLocalAppData({
          settings: localSettings,
          wallets: [wallet],
        });
      } else {
        await updateSettings({
          patch: {
            date_format: values.dateFormat,
            savings_goal_percent: values.savingsGoalPercent,
          },
          userId: user.id,
        });

        await createWallet({
          input: {
            color: values.walletColor,
            currency: values.walletCurrency,
            name: values.walletName,
            position: 0,
          },
          userId: user.id,
        });

        await refreshAppData({ isDevBypass: false, userId: user.id });
      }

      router.replace("/dashboard");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo completar el onboarding inicial.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <OnboardingForm
        initialDateFormat={settings?.dateFormat ?? "DD/MM/YYYY"}
        initialSavingsGoalPercent={settings?.savingsGoalPercent ?? 20}
        isSubmitting={isSubmitting}
        onSubmit={(values) => {
          void handleSubmit(values);
        }}
        submitError={submitError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F1223",
  },
});
