import { sortLedgerEntries, type LedgerEntry } from "@/modules/ledger/types";

export function resolveVisibleLedgerEntries(
  entries: LedgerEntry[],
  selectedWalletId: string | null,
) {
  const sortedEntries = sortLedgerEntries(entries);

  return selectedWalletId
    ? sortedEntries.filter((entry) => entry.walletId === selectedWalletId)
    : sortedEntries;
}
