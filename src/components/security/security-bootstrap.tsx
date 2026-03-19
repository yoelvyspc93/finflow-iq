import { useEffect } from "react";

import { getPrimaryTotpFactor } from "@/lib/auth/mfa";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";

export function SecurityBootstrap() {
  const authStatus = useAuthStore((state) => state.status);
  const resetSecurity = useSecurityStore((state) => state.reset);
  const setError = useSecurityStore((state) => state.setError);
  const setLoaded = useSecurityStore((state) => state.setLoaded);
  const setMfa = useSecurityStore((state) => state.setMfa);

  useEffect(() => {
    let isMounted = true;

    async function loadMfaState() {
      if (authStatus !== "authenticated") {
        resetSecurity();
        return;
      }

      try {
        const factor = await getPrimaryTotpFactor();
        if (!isMounted) {
          return;
        }

        setMfa({
          factorId: factor?.id ?? null,
          isEnabled: Boolean(factor),
        });
        setError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el estado de la verificación en dos pasos.",
        );
      } finally {
        if (isMounted) {
          setLoaded(true);
        }
      }
    }

    void loadMfaState();

    return () => {
      isMounted = false;
    };
  }, [authStatus, resetSecurity, setError, setLoaded, setMfa]);

  return null;
}
