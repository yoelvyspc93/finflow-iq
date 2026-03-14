import type { Tables } from "@/types/supabase";

export type CurrencyExchangeRow = Tables<"currency_exchanges">;

export type CurrencyExchange = {
  createdAt: string;
  description: string | null;
  exchangeInEntryId: string;
  exchangeOutEntryId: string;
  exchangeRate: number;
  fromAmount: number;
  fromWalletId: string;
  id: string;
  toAmount: number;
  toWalletId: string;
  transferDate: string;
  userId: string;
};

export type TransferBetweenWalletsInput = {
  description?: string | null;
  destinationAmount: number;
  destinationWalletId: string;
  exchangeRate: number;
  sourceAmount: number;
  sourceWalletId: string;
  transferDate: string;
};

export type CreateLocalCurrencyExchangeInput = {
  description?: string | null;
  destinationAmount: number;
  destinationWalletId: string;
  exchangeRate: number;
  exchangeInEntryId: string;
  exchangeOutEntryId: string;
  sourceAmount: number;
  sourceWalletId: string;
  transferDate: string;
  userId: string;
};

export function mapCurrencyExchange(row: CurrencyExchangeRow): CurrencyExchange {
  return {
    createdAt: row.created_at,
    description: row.description,
    exchangeInEntryId: row.exchange_in_entry_id,
    exchangeOutEntryId: row.exchange_out_entry_id,
    exchangeRate: row.exchange_rate,
    fromAmount: row.from_amount,
    fromWalletId: row.from_wallet_id,
    id: row.id,
    toAmount: row.to_amount,
    toWalletId: row.to_wallet_id,
    transferDate: row.transfer_date,
    userId: row.user_id,
  };
}

export function createMockCurrencyExchanges(userId: string): CurrencyExchange[] {
  return [
    {
      createdAt: new Date().toISOString(),
      description: "Cambio demo",
      exchangeInEntryId: "mock-exchange-in-ledger",
      exchangeOutEntryId: "mock-exchange-out-ledger",
      exchangeRate: 24,
      fromAmount: 10,
      fromWalletId: "dev-wallet-primary",
      id: "mock-currency-exchange-1",
      toAmount: 240,
      toWalletId: "dev-wallet-secondary",
      transferDate: new Date().toISOString().slice(0, 10),
      userId,
    },
  ];
}

export function createLocalCurrencyExchange(
  input: CreateLocalCurrencyExchangeInput,
): CurrencyExchange {
  return {
    createdAt: new Date().toISOString(),
    description: input.description ?? null,
    exchangeInEntryId: input.exchangeInEntryId,
    exchangeOutEntryId: input.exchangeOutEntryId,
    exchangeRate: input.exchangeRate,
    fromAmount: input.sourceAmount,
    fromWalletId: input.sourceWalletId,
    id: `local-currency-exchange-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,
    toAmount: input.destinationAmount,
    toWalletId: input.destinationWalletId,
    transferDate: input.transferDate,
    userId: input.userId,
  };
}
