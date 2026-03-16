import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import * as SplashScreen from "expo-splash-screen";

import { getPendingMfaFactorId } from "@/lib/auth/mfa";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be controlled by Expo in development.
});

async function hideSplashScreen() {
  try {
    await SplashScreen.hideAsync();
  } catch {
    // Ignore repeated hide calls.
  }
}

export function AuthBootstrap() {
  const isMountedRef = useRef(true);
  const setError = useAuthStore((state) => state.setError);
  const setPendingMfaFactorId = useAuthStore((state) => state.setPendingMfaFactorId);
  const setReady = useAuthStore((state) => state.setReady);
  const setSession = useAuthStore((state) => state.setSession);
  const isReady = useAuthStore((state) => state.isReady);

  useEffect(() => {
    isMountedRef.current = true;

    async function syncPendingMfa() {
      try {
        const pendingFactorId = await getPendingMfaFactorId();
        if (isMountedRef.current) {
          setPendingMfaFactorId(pendingFactorId);
        }
      } catch (error) {
        if (isMountedRef.current) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo verificar el estado de MFA.",
          );
        }
      }
    }

    async function bootstrap() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMountedRef.current) {
          return;
        }

        if (error) {
          setError(error.message);
        }

        setSession(session);
        if (session) {
          await syncPendingMfa();
        }
      } catch (error) {
        if (isMountedRef.current) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo restaurar la sesión.",
          );
          setSession(null);
        }
      } finally {
        if (isMountedRef.current) {
          setReady(true);
        }
      }
    }

    const authSubscription = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMountedRef.current) {
          setSession(session);
          if (session) {
            void syncPendingMfa();
          } else {
            setPendingMfaFactorId(null);
          }
        }
      },
    );

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });

    void bootstrap();

    return () => {
      isMountedRef.current = false;
      authSubscription.data.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [setError, setPendingMfaFactorId, setReady, setSession]);

  useEffect(() => {
    if (isReady) {
      void hideSplashScreen();
    }
  }, [isReady]);

  return null;
}
