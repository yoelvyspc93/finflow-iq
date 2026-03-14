import type { Tables } from "@/types/supabase";

export type CategoryRow = Tables<"categories">;

export type Category = {
  color: string;
  createdAt: string;
  icon: string;
  id: string;
  isDefault: boolean;
  name: string;
  userId: string;
};

export function mapCategory(row: CategoryRow): Category {
  return {
    color: row.color,
    createdAt: row.created_at,
    icon: row.icon,
    id: row.id,
    isDefault: row.is_default,
    name: row.name,
    userId: row.user_id,
  };
}

export function createMockCategories(userId: string): Category[] {
  const now = new Date().toISOString();

  return [
    {
      color: "#F97316",
      createdAt: now,
      icon: "receipt",
      id: "mock-category-food",
      isDefault: true,
      name: "Alimentacion",
      userId,
    },
    {
      color: "#22C55E",
      createdAt: now,
      icon: "car",
      id: "mock-category-transport",
      isDefault: true,
      name: "Transporte",
      userId,
    },
    {
      color: "#38BDF8",
      createdAt: now,
      icon: "bolt",
      id: "mock-category-services",
      isDefault: true,
      name: "Servicios",
      userId,
    },
    {
      color: "#F43F5E",
      createdAt: now,
      icon: "sparkles",
      id: "mock-category-misc",
      isDefault: true,
      name: "Varios",
      userId,
    },
  ];
}
