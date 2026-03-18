import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalLedgerEntry } from "@/modules/ledger/types";

const appState = {
  selectedWalletId: "wallet-a" as string | null,
};

vi.mock("@/modules/ledger/service", () => ({
  listLedgerEntries: vi.fn(),
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: {
    getState: () => appState,
  },
}));

const { useLedgerStore } = await import("@/stores/ledger-store");

function createEntry(walletId: string, amount = 25) {
  return createLocalLedgerEntry({
    amount,
    date: "2026-03-18",
    description: `entry-${walletId}`,
    type: amount >= 0 ? "income" : "expense",
    userId: "user-1",
    walletId,
  });
}

describe("useLedgerStore", () => {
  beforeEach(() => {
    appState.selectedWalletId = "wallet-a";
    useLedgerStore.getState().reset();
  });

  it("keeps the visible list scoped to the selected wallet when adding local entries", () => {
    useLedgerStore.getState().addLocalEntry(createEntry("wallet-a", 100));
    useLedgerStore.getState().addLocalEntry(createEntry("wallet-b", -20));

    const state = useLedgerStore.getState();

    expect(state.devEntries).toHaveLength(2);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]?.walletId).toBe("wallet-a");
  });

  it("shows all local entries when there is no selected wallet", () => {
    appState.selectedWalletId = null;

    useLedgerStore.getState().addLocalEntry(createEntry("wallet-a", 100));
    useLedgerStore.getState().addLocalEntry(createEntry("wallet-b", -20));

    expect(useLedgerStore.getState().entries).toHaveLength(2);
  });
});
