import { create } from "zustand";

import { getSettings } from "@/modules/settings/service";
import type { AppSettings } from "@/modules/settings/types";
import { listWallets } from "@/modules/wallets/service";
import type { Wallet } from "@/modules/wallets/types";

type LocalAppDataInput = {
  settings: AppSettings | null;
  wallets: Wallet[];
};

type AppStore = {
  applyLocalAppData: (input: LocalAppDataInput) => void;
  applyWalletBalanceDelta: (args: {
    amount: number;
    walletId: string;
  }) => void;
  error: string | null;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  isReady: boolean;
  removeLocalWallet: (walletId: string) => void;
  replaceLocalSettings: (settings: AppSettings | null) => void;
  refreshAppData: (args: { userId: string }) => Promise<void>;
  reset: () => void;
  selectedWalletId: string | null;
  setSelectedWalletId: (walletId: string | null) => void;
  settings: AppSettings | null;
  upsertLocalWallet: (wallet: Wallet) => void;
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
  if (
    current &&
    wallets.some((wallet) => wallet.id === current && wallet.isActive)
  ) {
    return current;
  }

  const activeWallet = wallets.find((wallet) => wallet.isActive);
  return activeWallet?.id ?? wallets[0]?.id ?? null;
}

function buildStateFromData(
  input: LocalAppDataInput,
  currentSelectedWalletId: string | null,
) {
  return {
    error: null,
    hasCompletedOnboarding: input.wallets.length > 0,
    isLoading: false,
    isReady: true,
    selectedWalletId: resolveSelectedWalletId(
      input.wallets,
      currentSelectedWalletId,
    ),
    settings: input.settings,
    wallets: input.wallets,
  };
}

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,
  applyLocalAppData: (input) =>
    set((state) => buildStateFromData(input, state.selectedWalletId)),
  applyWalletBalanceDelta: ({ amount, walletId }) =>
    set((state) => ({
      wallets: state.wallets.map((wallet) =>
        wallet.id === walletId
          ? {
              ...wallet,
              balance: wallet.balance + amount,
              updatedAt: new Date().toISOString(),
            }
          : wallet,
      ),
    })),
  removeLocalWallet: (walletId) =>
    set((state) =>
      buildStateFromData(
        {
          settings: state.settings,
          wallets: state.wallets.filter((wallet) => wallet.id !== walletId),
        },
        state.selectedWalletId,
      ),
    ),
  replaceLocalSettings: (settings) => set({ settings }),
  refreshAppData: async ({ userId }) => {
    set({ error: null, isLoading: true });

    try {
      const [settings, wallets] = await Promise.all([
        getSettings({ userId }),
        listWallets({ userId }),
      ]);

      set((state) =>
        buildStateFromData(
          {
            settings,
            wallets,
          },
          state.selectedWalletId,
        ),
      );
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las billeteras y la configuración.",
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
  upsertLocalWallet: (wallet) =>
    set((state) => {
      const existingIndex = state.wallets.findIndex((item) => item.id === wallet.id);
      const wallets =
        existingIndex === -1
          ? [...state.wallets, wallet].sort((left, right) => left.position - right.position)
          : state.wallets.map((item) => (item.id === wallet.id ? wallet : item));

      return buildStateFromData(
        {
          settings: state.settings,
          wallets,
        },
        state.selectedWalletId,
      );
    }),
  wallets: [],
}));
