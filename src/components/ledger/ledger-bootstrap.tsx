import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useLedgerStore } from "@/stores/ledger-store";
import { useSecurityStore } from "@/stores/security-store";

export function LedgerBootstrap() {
  const authStatus = useAuthStore((state) => state.status);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const isAppReady = useAppStore((state) => state.isReady);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const pinStatus = useSecurityStore((state) => state.pinStatus);
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);
  const reset = useLedgerStore((state) => state.reset);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      reset();
      return;
    }

    if (pinStatus === "locked" || !isAppReady || !user?.id) {
      return;
    }

    void refreshLedger({
      isDevBypass,
      userId: user.id,
      walletId: selectedWalletId,
    });
  }, [
    authStatus,
    isAppReady,
    isDevBypass,
    pinStatus,
    refreshLedger,
    reset,
    selectedWalletId,
    user?.id,
  ]);

  return null;
}
