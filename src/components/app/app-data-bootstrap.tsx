import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";

export function AppDataBootstrap() {
  const authStatus = useAuthStore((state) => state.status);
  const pendingMfaFactorId = useAuthStore((state) => state.pendingMfaFactorId);
  const user = useAuthStore((state) => state.user);
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const reset = useAppStore((state) => state.reset);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      reset();
      return;
    }

    if (pendingMfaFactorId || !user?.id) {
      return;
    }

    void refreshAppData({ userId: user.id });
  }, [authStatus, pendingMfaFactorId, refreshAppData, reset, user?.id]);

  return null;
}
