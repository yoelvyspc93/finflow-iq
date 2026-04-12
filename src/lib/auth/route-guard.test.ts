import { resolveProtectedRoute } from "@/lib/auth/route-guard";

describe("resolveProtectedRoute", () => {
  it("blocks while auth bootstrap is incomplete", () => {
    expect(
      resolveProtectedRoute({
        authStatus: "idle",
        hasCompletedOnboarding: false,
        isAppReady: false,
        isAuthReady: false,
        pendingMfaFactorId: null,
      }),
    ).toEqual({
      isLoading: true,
      loadingMessage: "Restaurando sesión...",
      redirectTo: null,
      requiresOnboarding: false,
    });
  });

  it("redirects unauthenticated users to login", () => {
    expect(
      resolveProtectedRoute({
        authStatus: "unauthenticated",
        hasCompletedOnboarding: false,
        isAppReady: true,
        isAuthReady: true,
        pendingMfaFactorId: null,
      }).redirectTo,
    ).toBe("/login");
  });

  it("redirects authenticated users with pending MFA to /mfa", () => {
    expect(
      resolveProtectedRoute({
        authStatus: "authenticated",
        hasCompletedOnboarding: true,
        isAppReady: true,
        isAuthReady: true,
        pendingMfaFactorId: "factor-id",
      }).redirectTo,
    ).toBe("/mfa");
  });

  it("requires onboarding when auth is valid and app data is loaded", () => {
    expect(
      resolveProtectedRoute({
        authStatus: "authenticated",
        hasCompletedOnboarding: false,
        isAppReady: true,
        isAuthReady: true,
        pendingMfaFactorId: null,
      }).requiresOnboarding,
    ).toBe(true);
  });
});
