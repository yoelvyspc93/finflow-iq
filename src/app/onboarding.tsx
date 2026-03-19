import { useState } from "react";
import { StyleSheet } from "react-native";

import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  OnboardingForm,
  type OnboardingFormValues,
} from "@/components/onboarding/onboarding-form";
import { AppLoadingScreen } from "@/components/app/app-loading-screen";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { updateSettings } from "@/modules/settings/service";
import { createWallet } from "@/modules/wallets/service";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";

export default function OnboardingScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guard = useOnboardingGuard();
  const user = useAuthStore((state) => state.user);
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
      setSubmitError("No hay una sesión activa para completar la configuración inicial.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
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

      await refreshAppData({ userId: user.id });
      router.replace("/dashboard");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la configuración inicial.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
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
