import type { LedgerEntry } from "@/modules/ledger/types";
import type { Wallet } from "@/modules/wallets/types";

export function selectActiveWallet(
  wallets: Wallet[],
  selectedWalletId: string | null,
) {
  if (selectedWalletId) {
    const selected = wallets.find(
      (wallet) => wallet.id === selectedWalletId && wallet.isActive,
    );
    if (selected) {
      return selected;
    }
  }

  return wallets.find((wallet) => wallet.isActive) ?? null;
}

export function selectActiveWalletBalance(
  wallets: Wallet[],
  selectedWalletId: string | null,
) {
  return selectActiveWallet(wallets, selectedWalletId)?.balance ?? 0;
}

export function selectRecentLedgerEntries(entries: LedgerEntry[], limit = 5) {
  return entries.slice(0, limit);
}

export function selectEntriesByWallet(
  entries: LedgerEntry[],
  walletId: string | null,
) {
  if (!walletId) {
    return entries;
  }

  return entries.filter((entry) => entry.walletId === walletId);
}
