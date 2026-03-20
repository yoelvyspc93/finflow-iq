import { beforeEach, describe, expect, it, vi } from "vitest";

const queryState = {
  eqCalls: [] as Array<[string, unknown]>,
  insertPayload: null as unknown,
  updatePayload: null as unknown,
};

const queryBuilder = {
  select: vi.fn(() => queryBuilder),
  eq: vi.fn((column: string, value: unknown) => {
    queryState.eqCalls.push([column, value]);
    return queryBuilder;
  }),
  order: vi.fn(() => queryBuilder),
  insert: vi.fn((payload: unknown) => {
    queryState.insertPayload = payload;
    return queryBuilder;
  }),
  update: vi.fn((payload: unknown) => {
    queryState.updatePayload = payload;
    return queryBuilder;
  }),
  delete: vi.fn(() => queryBuilder),
  single: vi.fn(async () => ({
    data: {
      color: "#4F6BFF",
      created_at: "2026-03-20T00:00:00.000Z",
      icon: "shapes",
      id: "cat-1",
      is_active: true,
      is_default: false,
      name: "Comida",
      user_id: "user-1",
    },
    error: null,
  })),
  then: (resolve: (value: unknown) => unknown) =>
    Promise.resolve(
      resolve({
        data: [],
        error: null,
      }),
    ),
};

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryBuilder),
  },
}));

import {
  createCategory,
  listCategories,
  updateCategory,
} from "@/modules/categories/service";

describe("category service", () => {
  beforeEach(() => {
    queryState.eqCalls = [];
    queryState.insertPayload = null;
    queryState.updatePayload = null;
    queryBuilder.select.mockClear();
    queryBuilder.eq.mockClear();
    queryBuilder.order.mockClear();
    queryBuilder.insert.mockClear();
    queryBuilder.update.mockClear();
    queryBuilder.single.mockClear();
  });

  it("filters inactive categories by default", async () => {
    await listCategories({ userId: "user-1" });

    expect(queryState.eqCalls).toContainEqual(["user_id", "user-1"]);
    expect(queryState.eqCalls).toContainEqual(["is_active", true]);
  });

  it("includes inactive categories when requested", async () => {
    await listCategories({ includeInactive: true, userId: "user-1" });

    expect(queryState.eqCalls).toContainEqual(["user_id", "user-1"]);
    expect(queryState.eqCalls).not.toContainEqual(["is_active", true]);
  });

  it("creates categories as active and updates isActive", async () => {
    await createCategory({ name: "Compras", userId: "user-1" });
    await updateCategory({
      categoryId: "cat-1",
      patch: { isActive: false },
      userId: "user-1",
    });

    expect(queryState.insertPayload).toMatchObject({ is_active: true, name: "Compras" });
    expect(queryState.updatePayload).toMatchObject({ is_active: false });
  });
});
