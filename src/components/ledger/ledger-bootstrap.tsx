import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useLedgerStore } from "@/stores/ledger-store";

export function LedgerBootstrap() {
  const authStatus = useAuthStore((state) => state.status);
  const pendingMfaFactorId = useAuthStore((state) => state.pendingMfaFactorId);
  const user = useAuthStore((state) => state.user);
  const isAppReady = useAppStore((state) => state.isReady);
  const selectedWalletId = useAppStore((state) => state.selectedWalletId);
  const refreshLedger = useLedgerStore((state) => state.refreshLedger);
  const reset = useLedgerStore((state) => state.reset);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      reset();
      return;
    }

    if (pendingMfaFactorId || !isAppReady || !user?.id) {
      return;
    }

    void refreshLedger({
      userId: user.id,
      walletId: selectedWalletId,
    });
  }, [
    authStatus,
    isAppReady,
    pendingMfaFactorId,
    refreshLedger,
    reset,
    selectedWalletId,
    user?.id,
  ]);

  return null;
}
