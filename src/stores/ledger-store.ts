import { create } from "zustand";

import { listLedgerEntries } from "@/modules/ledger/service";
import {
  sortLedgerEntries,
  type LedgerEntry,
} from "@/modules/ledger/types";

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
        entries: entry.walletId
          ? devEntries.filter((item) => item.walletId === entry.walletId)
          : devEntries,
      };
    }),
  refreshLedger: async ({ isDevBypass, userId, walletId }) => {
    set({ error: null, isLoading: true });

    try {
      if (isDevBypass) {
        set({
          entries: walletId
            ? sortLedgerEntries(
                useLedgerStore
                  .getState()
                  .devEntries.filter((entry) => entry.walletId === walletId),
              )
            : sortLedgerEntries(useLedgerStore.getState().devEntries),
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
        entries: sortLedgerEntries(entries),
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
