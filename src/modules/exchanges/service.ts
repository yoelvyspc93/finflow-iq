import { supabase } from "@/lib/supabase/client";
import {
  mapCurrencyExchange,
  type CurrencyExchange,
  type TransferBetweenWalletsInput,
} from "@/modules/exchanges/types";

type ListCurrencyExchangesArgs = {
  userId: string;
};

export async function listCurrencyExchanges({
  userId,
}: ListCurrencyExchangesArgs): Promise<CurrencyExchange[]> {
  const { data, error } = await supabase
    .from("currency_exchanges")
    .select("*")
    .eq("user_id", userId)
    .order("transfer_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCurrencyExchange);
}

export async function transferBetweenWallets(
  input: TransferBetweenWalletsInput,
): Promise<CurrencyExchange> {
  const { data, error } = await supabase.rpc("transfer_between_wallets", {
    destination_amount: input.destinationAmount,
    destination_wallet_id: input.destinationWalletId,
    quoted_exchange_rate: input.exchangeRate,
    source_amount: input.sourceAmount,
    source_wallet_id: input.sourceWalletId,
    target_transfer_date: input.transferDate,
    transfer_description: input.description ?? undefined,
  });

  if (error) {
    throw error;
  }

  return mapCurrencyExchange(data);
}
