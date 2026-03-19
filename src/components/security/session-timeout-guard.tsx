import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";

export function SessionTimeoutGuard() {
  const authStatus = useAuthStore((state) => state.status);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const settings = useAppStore((state) => state.settings);
  const lastActivityAt = useSecurityStore((state) => state.lastActivityAt);
  const setLastActivityAt = useSecurityStore((state) => state.setLastActivityAt);
  const isSigningOutRef = useRef(false);

  const sessionTimeoutMinutes = settings?.sessionTimeoutMinutes ?? 5;
  const timeoutMs =
    sessionTimeoutMinutes === 0 ? 1_000 : sessionTimeoutMinutes * 60_000;

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    const touchEvents = ["mousedown", "keydown", "touchstart", "scroll"];
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const markActivity = () => setLastActivityAt();

      touchEvents.forEach((eventName) =>
        window.addEventListener(eventName, markActivity, { passive: true }),
      );

      return () => {
        touchEvents.forEach((eventName) =>
          window.removeEventListener(eventName, markActivity),
        );
      };
    }

    return;
  }, [authStatus, setLastActivityAt]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setLastActivityAt();
      }

      if (nextState !== "active" && sessionTimeoutMinutes === 0) {
        if (isSigningOutRef.current) {
          return;
        }

        isSigningOutRef.current = true;
        void supabase.auth.signOut({ scope: "local" }).finally(() => {
          clearAuth();
          isSigningOutRef.current = false;
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [authStatus, clearAuth, sessionTimeoutMinutes, setLastActivityAt]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    const remainingMs = Math.max(timeoutMs - (Date.now() - lastActivityAt), 0);
    const timer = setTimeout(() => {
      if (isSigningOutRef.current) {
        return;
      }

      if (Date.now() - lastActivityAt < timeoutMs) {
        return;
      }

      isSigningOutRef.current = true;
      void supabase.auth.signOut({ scope: "local" }).finally(() => {
        clearAuth();
        isSigningOutRef.current = false;
      });
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [authStatus, clearAuth, lastActivityAt, timeoutMs]);

  return null;
}
