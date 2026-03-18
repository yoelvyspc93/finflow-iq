import { create } from "zustand";

import { listLedgerEntries } from "@/modules/ledger/service";
import { resolveVisibleLedgerEntries } from "@/modules/ledger/view-state";
import {
  sortLedgerEntries,
  type LedgerEntry,
} from "@/modules/ledger/types";
import { useAppStore } from "@/stores/app-store";

type RefreshLedgerArgs = {
  isDevBypass: boolean;
  userId: string;
  walletId: string | null;
};

type LedgerStore = {
  addLocalEntry: (entry: LedgerEntry) => void;
  devEntries: LedgerEntry[];
  entries: LedgerEntry[];
  error: string | null;
  isLoading: boolean;
  isReady: boolean;
  refreshLedger: (args: RefreshLedgerArgs) => Promise<void>;
  reset: () => void;
};

const initialState = {
  devEntries: [] as LedgerEntry[],
  entries: [] as LedgerEntry[],
  error: null,
  isLoading: false,
  isReady: false,
};

export const useLedgerStore = create<LedgerStore>((set) => ({
  ...initialState,
  addLocalEntry: (entry) =>
    set((state) => {
      const devEntries = sortLedgerEntries([entry, ...state.devEntries]);
      return {
        devEntries,
        entries: resolveVisibleLedgerEntries(
          devEntries,
          useAppStore.getState().selectedWalletId,
        ),
      };
    }),
  refreshLedger: async ({ isDevBypass, userId, walletId }) => {
    set({ error: null, isLoading: true });

    try {
      if (isDevBypass) {
        set({
          entries: resolveVisibleLedgerEntries(
            useLedgerStore.getState().devEntries,
            walletId,
          ),
          error: null,
          isLoading: false,
          isReady: true,
        });
        return;
      }

      if (!walletId) {
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
        entries: resolveVisibleLedgerEntries(entries, walletId),
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
