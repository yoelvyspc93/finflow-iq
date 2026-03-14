import { create } from "zustand";

import { getSettings } from "@/modules/settings/service";
import { createMockSettings, type AppSettings } from "@/modules/settings/types";
import { listWallets } from "@/modules/wallets/service";
import type { Wallet } from "@/modules/wallets/types";

type AppStore = {
  error: string | null;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  isReady: boolean;
  refreshAppData: (args: { isDevBypass: boolean; userId: string }) => Promise<void>;
  reset: () => void;
  selectedWalletId: string | null;
  setSelectedWalletId: (walletId: string | null) => void;
  settings: AppSettings | null;
  wallets: Wallet[];
};

const initialState = {
  error: null,
  hasCompletedOnboarding: false,
  isLoading: false,
  isReady: false,
  selectedWalletId: null,
  settings: null,
  wallets: [] as Wallet[],
};

function resolveSelectedWalletId(wallets: Wallet[], current: string | null) {
  if (current && wallets.some((wallet) => wallet.id === current)) {
    return current;
  }

  const activeWallet = wallets.find((wallet) => wallet.isActive);
  return activeWallet?.id ?? wallets[0]?.id ?? null;
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,
  refreshAppData: async ({ isDevBypass, userId }) => {
    set({ error: null, isLoading: true });

    try {
      if (isDevBypass) {
        set({
          error: null,
          hasCompletedOnboarding: false,
          isLoading: false,
          isReady: true,
          selectedWalletId: null,
          settings: createMockSettings(userId),
          wallets: [],
        });
        return;
      }

      const [settings, wallets] = await Promise.all([
        getSettings({ userId }),
        listWallets({ userId }),
      ]);

      const selectedWalletId = resolveSelectedWalletId(
        wallets,
        get().selectedWalletId,
      );

      set({
        error: null,
        hasCompletedOnboarding: Boolean(settings) && wallets.length > 0,
        isLoading: false,
        isReady: true,
        selectedWalletId,
        settings,
        wallets,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar wallets y settings.",
        hasCompletedOnboarding: false,
        isLoading: false,
        isReady: true,
      });
    }
  },
  reset: () => set(initialState),
  selectedWalletId: null,
  setSelectedWalletId: (selectedWalletId) => set({ selectedWalletId }),
  settings: null,
  wallets: [],
}));
