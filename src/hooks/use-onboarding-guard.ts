import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";

type OnboardingGuardResult = {
  isLoading: boolean;
  loadingMessage: string;
  redirectTo: "/login" | "/mfa" | null;
  requiresOnboarding: boolean;
};

export function useOnboardingGuard(): OnboardingGuardResult {
  const isAuthReady = useAuthStore((state) => state.isReady);
  const authStatus = useAuthStore((state) => state.status);
  const pendingMfaFactorId = useAuthStore((state) => state.pendingMfaFactorId);
  const isAppReady = useAppStore((state) => state.isReady);
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );

  if (!isAuthReady || authStatus === "idle" || authStatus === "loading") {
    return {
      isLoading: true,
      loadingMessage: "Restaurando sesion...",
      redirectTo: null,
      requiresOnboarding: false,
    };
  }

  if (authStatus !== "authenticated") {
    return {
      isLoading: false,
      loadingMessage: "",
      redirectTo: "/login",
      requiresOnboarding: false,
    };
  }

  if (pendingMfaFactorId) {
    return {
      isLoading: false,
      loadingMessage: "",
      redirectTo: "/mfa",
      requiresOnboarding: false,
    };
  }

  if (!isAppReady) {
    return {
      isLoading: true,
      loadingMessage: "Sincronizando wallets y ajustes...",
      redirectTo: null,
      requiresOnboarding: false,
    };
  }

  return {
    isLoading: false,
    loadingMessage: "",
    redirectTo: null,
    requiresOnboarding: !hasCompletedOnboarding,
  };
}
