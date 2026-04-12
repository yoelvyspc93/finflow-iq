export type ProtectedRouteGuardInput = {
  authStatus: "idle" | "loading" | "authenticated" | "unauthenticated";
  hasCompletedOnboarding: boolean;
  isAppReady: boolean;
  isAuthReady: boolean;
  pendingMfaFactorId: string | null;
};

export type ProtectedRouteGuardResult = {
  isLoading: boolean;
  loadingMessage: string;
  redirectTo: "/login" | "/mfa" | null;
  requiresOnboarding: boolean;
};

export function resolveProtectedRoute(
  input: ProtectedRouteGuardInput,
): ProtectedRouteGuardResult {
  if (
    !input.isAuthReady ||
    input.authStatus === "idle" ||
    input.authStatus === "loading"
  ) {
    return {
      isLoading: true,
      loadingMessage: "Restaurando sesión...",
      redirectTo: null,
      requiresOnboarding: false,
    };
  }

  if (input.authStatus !== "authenticated") {
    return {
      isLoading: false,
      loadingMessage: "",
      redirectTo: "/login",
      requiresOnboarding: false,
    };
  }

  if (input.pendingMfaFactorId) {
    return {
      isLoading: false,
      loadingMessage: "",
      redirectTo: "/mfa",
      requiresOnboarding: false,
    };
  }

  if (!input.isAppReady) {
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
    requiresOnboarding: !input.hasCompletedOnboarding,
  };
}
