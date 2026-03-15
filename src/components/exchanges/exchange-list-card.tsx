import { StyleSheet, Text, View } from "react-native";

import type { CurrencyExchange } from "@/modules/exchanges/types";
import type { Wallet } from "@/modules/wallets/types";

type ExchangeListCardProps = {
  exchanges: CurrencyExchange[];
  isLoading: boolean;
  wallets: Wallet[];
};

function findWalletName(wallets: Wallet[], walletId: string) {
  return wallets.find((wallet) => wallet.id === walletId)?.name ?? "Wallet";
}

export function ExchangeListCard({
  exchanges,
  isLoading,
  wallets,
}: ExchangeListCardProps) {
  const visibleExchanges = exchanges.slice(0, 6);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Transferencias recientes</Text>

      {isLoading ? (
        <Text style={styles.helperText}>Actualizando transferencias...</Text>
      ) : null}

      {visibleExchanges.length ? (
        visibleExchanges.map((exchange) => (
          <View key={exchange.id} style={styles.row}>
            <View style={styles.textGroup}>
              <Text style={styles.primaryText}>
                {findWalletName(wallets, exchange.fromWalletId)} {"->"}{" "}
                {findWalletName(wallets, exchange.toWalletId)}
              </Text>
              <Text style={styles.secondaryText}>
                {exchange.transferDate} | tasa {exchange.exchangeRate.toFixed(4)}
              </Text>
            </View>

            <View style={styles.amountGroup}>
              <Text style={styles.amountOut}>-{exchange.fromAmount.toFixed(2)}</Text>
              <Text style={styles.amountIn}>+{exchange.toAmount.toFixed(2)}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Sin transferencias por ahora</Text>
          <Text style={styles.emptyText}>
            Cuando muevas saldo entre wallets, el historial quedara trazado aqui.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: "#0C1324",
    gap: 12,
    padding: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#121B31",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textGroup: {
    flex: 1,
    gap: 4,
  },
  primaryText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  amountGroup: {
    alignItems: "flex-end",
    gap: 2,
  },
  amountOut: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "800",
  },
  amountIn: {
    color: "#86EFAC",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    backgroundColor: "#11182D",
    gap: 8,
    padding: 16,
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
});
