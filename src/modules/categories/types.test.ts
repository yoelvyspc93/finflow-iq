import { describe, expect, it } from "vitest";

import { mapCategory } from "@/modules/categories/types";

describe("category types", () => {
  it("maps is_active to isActive", () => {
    const category = mapCategory({
      color: "#4F6BFF",
      created_at: "2026-03-20T00:00:00.000Z",
      icon: "shapes",
      id: "cat-1",
      is_active: false,
      is_default: false,
      name: "Viajes",
      user_id: "user-1",
    });

    expect(category.isActive).toBe(false);
    expect(category.name).toBe("Viajes");
  });
});
