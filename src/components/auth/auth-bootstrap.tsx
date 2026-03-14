import { useEffect } from "react";
import { AppState } from "react-native";

import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";

import { applyAuthRedirectUrl } from "@/lib/auth/session";
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
  const setError = useAuthStore((state) => state.setError);
  const setReady = useAuthStore((state) => state.setReady);
  const setSession = useAuthStore((state) => state.setSession);
  const isReady = useAuthStore((state) => state.isReady);

  useEffect(() => {
    let isMounted = true;

    async function handleUrl(url: string) {
      const { error } = await applyAuthRedirectUrl(url);

      if (error && isMounted) {
        setError(error.message);
      }
    }

    async function bootstrap() {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          await handleUrl(initialUrl);
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (error) {
          setError(error.message);
        }

        setSession(session);
      } catch (error) {
        if (isMounted) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudo restaurar la sesión.",
          );
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setReady(true);
        }
      }
    }

    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    const authSubscription = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setSession(session);
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
      isMounted = false;
      linkSubscription.remove();
      authSubscription.data.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [setError, setReady, setSession]);

  useEffect(() => {
    if (isReady) {
      void hideSplashScreen();
    }
  }, [isReady]);

  return null;
}
