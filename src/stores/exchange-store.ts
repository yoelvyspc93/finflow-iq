import { create } from "zustand";

import { listCurrencyExchanges } from "@/modules/exchanges/service";
import type { CurrencyExchange } from "@/modules/exchanges/types";

type RefreshExchangeDataArgs = {
  isDevBypass: boolean;
  userId: string;
};

type ExchangeStore = {
  addLocalExchange: (exchange: CurrencyExchange) => void;
  error: string | null;
  exchanges: CurrencyExchange[];
  isLoading: boolean;
  isReady: boolean;
  refreshExchangeData: (args: RefreshExchangeDataArgs) => Promise<void>;
  reset: () => void;
};

const initialState = {
  error: null,
  exchanges: [] as CurrencyExchange[],
  isLoading: false,
  isReady: false,
};

function sortExchanges(exchanges: CurrencyExchange[]) {
  return [...exchanges].sort((left, right) => {
    const leftStamp = `${left.transferDate}T${left.createdAt}`;
    const rightStamp = `${right.transferDate}T${right.createdAt}`;
    return rightStamp.localeCompare(leftStamp);
  });
}

export const useExchangeStore = create<ExchangeStore>((set) => ({
  ...initialState,
  addLocalExchange: (exchange) =>
    set((state) => ({
      exchanges: sortExchanges([exchange, ...state.exchanges]),
    })),
  refreshExchangeData: async ({ isDevBypass, userId }) => {
    set({ error: null, isLoading: true });

    try {
      const exchanges = await listCurrencyExchanges({ isDevBypass, userId });

      set({
        error: null,
        exchanges: sortExchanges(exchanges),
        isLoading: false,
        isReady: true,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las transferencias.",
        exchanges: [],
        isLoading: false,
        isReady: true,
      });
    }
  },
  reset: () => set(initialState),
}));
