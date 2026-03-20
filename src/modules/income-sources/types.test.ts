import { describe, expect, it } from "vitest";

import { mapIncomeSource } from "@/modules/income-sources/types";

describe("income source types", () => {
  it("maps is_active to isActive", () => {
    const source = mapIncomeSource({
      created_at: "2026-03-20T00:00:00.000Z",
      id: "income-1",
      is_active: false,
      is_default: false,
      name: "Freelance",
      user_id: "user-1",
    });

    expect(source.isActive).toBe(false);
    expect(source.name).toBe("Freelance");
  });
});
