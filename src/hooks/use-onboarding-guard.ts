import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useSecurityStore } from "@/stores/security-store";

type OnboardingGuardResult = {
  isLoading: boolean;
  loadingMessage: string;
  redirectTo: "/login" | "/pin" | null;
  requiresOnboarding: boolean;
};

export function useOnboardingGuard(): OnboardingGuardResult {
  const isAuthReady = useAuthStore((state) => state.isReady);
  const authStatus = useAuthStore((state) => state.status);
  const isSecurityLoaded = useSecurityStore((state) => state.isLoaded);
  const pinStatus = useSecurityStore((state) => state.pinStatus);
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

  if (!isSecurityLoaded || pinStatus === "unknown") {
    return {
      isLoading: true,
      loadingMessage: "Preparando seguridad local...",
      redirectTo: null,
      requiresOnboarding: false,
    };
  }

  if (pinStatus !== "unlocked") {
    return {
      isLoading: false,
      loadingMessage: "",
      redirectTo: "/pin",
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
