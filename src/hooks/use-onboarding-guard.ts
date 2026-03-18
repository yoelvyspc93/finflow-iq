import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { resolveProtectedRoute } from "@/lib/auth/route-guard";

export function useOnboardingGuard() {
  const isAuthReady = useAuthStore((state) => state.isReady);
  const authStatus = useAuthStore((state) => state.status);
  const pendingMfaFactorId = useAuthStore((state) => state.pendingMfaFactorId);
  const isAppReady = useAppStore((state) => state.isReady);
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );

  return resolveProtectedRoute({
    authStatus,
    hasCompletedOnboarding,
    isAppReady,
    isAuthReady,
    pendingMfaFactorId,
  });
}
