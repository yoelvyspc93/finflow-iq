import { beforeEach, describe, expect, it, vi } from "vitest";

const listLedgerEntries = vi.fn();

vi.mock("@/modules/ledger/service", () => ({
  listLedgerEntries,
}));

const { useLedgerStore } = await import("@/stores/ledger-store");

describe("useLedgerStore", () => {
  beforeEach(() => {
    listLedgerEntries.mockReset();
    useLedgerStore.getState().reset();
  });

  it("loads entries for the selected wallet", async () => {
    listLedgerEntries.mockResolvedValue([
      {
        amount: 100,
        budgetProvisionId: null,
        categoryId: null,
        createdAt: "2026-03-18T12:00:00.000Z",
        date: "2026-03-18",
        description: "Ingreso",
        id: "entry-1",
        incomeSourceId: null,
        recurringExpenseId: null,
        type: "income",
        userId: "user-1",
        walletId: "wallet-a",
      },
      {
        amount: -20,
        budgetProvisionId: null,
        categoryId: null,
        createdAt: "2026-03-17T12:00:00.000Z",
        date: "2026-03-17",
        description: "Gasto",
        id: "entry-2",
        incomeSourceId: null,
        recurringExpenseId: null,
        type: "expense",
        userId: "user-1",
        walletId: "wallet-a",
      },
    ]);

    await useLedgerStore.getState().refreshLedger({
      userId: "user-1",
      walletId: "wallet-a",
    });

    const state = useLedgerStore.getState();

    expect(listLedgerEntries).toHaveBeenCalledWith({
      limit: 12,
      userId: "user-1",
      walletId: "wallet-a",
    });
    expect(state.entries).toHaveLength(2);
    expect(state.isReady).toBe(true);
  });

  it("clears entries when there is no selected wallet", async () => {
    await useLedgerStore.getState().refreshLedger({
      userId: "user-1",
      walletId: null,
    });

    expect(useLedgerStore.getState().entries).toEqual([]);
    expect(listLedgerEntries).not.toHaveBeenCalled();
  });
});
