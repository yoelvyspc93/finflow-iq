import { create } from "zustand";

import { listLedgerEntries } from "@/modules/ledger/service";
import type { LedgerEntry } from "@/modules/ledger/types";

type RefreshLedgerArgs = {
  isDevBypass: boolean;
  userId: string;
  walletId: string | null;
};

type LedgerStore = {
  entries: LedgerEntry[];
  error: string | null;
  isLoading: boolean;
  isReady: boolean;
  refreshLedger: (args: RefreshLedgerArgs) => Promise<void>;
  reset: () => void;
};

const initialState = {
  entries: [] as LedgerEntry[],
  error: null,
  isLoading: false,
  isReady: false,
};

export const useLedgerStore = create<LedgerStore>((set) => ({
  ...initialState,
  refreshLedger: async ({ isDevBypass, userId, walletId }) => {
    set({ error: null, isLoading: true });

    try {
      if (isDevBypass || !walletId) {
        set({
          entries: [],
          error: null,
          isLoading: false,
          isReady: true,
        });
        return;
      }

      const entries = await listLedgerEntries({
        limit: 12,
        userId,
        walletId,
      });

      set({
        entries,
        error: null,
        isLoading: false,
        isReady: true,
      });
    } catch (error) {
      set({
        entries: [],
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el historial del ledger.",
        isLoading: false,
        isReady: true,
      });
    }
  },
  reset: () => set(initialState),
}));
