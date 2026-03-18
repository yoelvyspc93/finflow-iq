import { Redirect, Stack } from "expo-router";

import { AppLoadingScreen } from "@/components/app/app-loading-screen";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

export default function SettingsStackLayout() {
  const guard = useOnboardingGuard();

  if (guard.isLoading) {
    return <AppLoadingScreen message={guard.loadingMessage} />;
  }

  if (guard.redirectTo) {
    return <Redirect href={guard.redirectTo} />;
  }

  if (guard.requiresOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
