import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useSecurityStore } from "@/stores/security-store";

export function AppDataBootstrap() {
  const authStatus = useAuthStore((state) => state.status);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const pinStatus = useSecurityStore((state) => state.pinStatus);
  const refreshAppData = useAppStore((state) => state.refreshAppData);
  const reset = useAppStore((state) => state.reset);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      reset();
      return;
    }

    if (pinStatus === "locked" || !user?.id) {
      return;
    }

    void refreshAppData({ isDevBypass, userId: user.id });
  }, [authStatus, isDevBypass, pinStatus, refreshAppData, reset, user?.id]);

  return null;
}
