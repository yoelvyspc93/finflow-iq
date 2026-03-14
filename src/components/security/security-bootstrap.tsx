import { useEffect } from "react";

import {
  bootstrapPinState,
  subscribeToAppLocking,
} from "@/lib/security/app-lock";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";

export function SecurityBootstrap() {
  const authStatus = useAuthStore((state) => state.status);
  const resetSecurity = useSecurityStore((state) => state.reset);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void bootstrapPinState();

      const subscription = subscribeToAppLocking();
      return () => {
        subscription.remove();
      };
    }

    resetSecurity();
    return undefined;
  }, [authStatus, resetSecurity]);

  return null;
}
