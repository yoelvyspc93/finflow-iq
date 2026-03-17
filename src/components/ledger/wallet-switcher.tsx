import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Wallet } from "@/modules/wallets/types";

type WalletSwitcherProps = {
  onSelect: (walletId: string) => void;
  selectedWalletId: string | null;
  wallets: Wallet[];
};

export function WalletSwitcher({
  onSelect,
  selectedWalletId,
  wallets,
}: WalletSwitcherProps) {
  const visibleWallets = wallets.filter((wallet) => wallet.isActive);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Wallets</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {visibleWallets.map((wallet) => {
          const isActive = wallet.id === selectedWalletId;

          return (
            <Pressable
              key={wallet.id}
              onPress={() => onSelect(wallet.id)}
              style={[
                styles.card,
                isActive && styles.cardActive,
                wallet.color ? { borderColor: wallet.color } : null,
              ]}
            >
              <View
                style={[
                  styles.accent,
                  { backgroundColor: wallet.color ?? "#4F6BFF" },
                ]}
              />
              <View style={styles.textGroup}>
                <Text style={styles.name}>{wallet.name}</Text>
                <Text style={styles.meta}>
                  {wallet.currency} {wallet.balance.toFixed(2)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  label: {
    color: "#8DA1C4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  row: {
    gap: 12,
    paddingRight: 24,
  },
  card: {
    minWidth: 170,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    backgroundColor: "#10192E",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardActive: {
    backgroundColor: "#16203A",
  },
  accent: {
    width: 10,
    alignSelf: "stretch",
    borderRadius: 999,
  },
  textGroup: {
    gap: 4,
  },
  name: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
});
