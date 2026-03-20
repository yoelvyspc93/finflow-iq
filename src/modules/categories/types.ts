import type { Tables } from "@/types/supabase";

export type CategoryRow = Tables<"categories">;

export type Category = {
  color: string;
  createdAt: string;
  icon: string;
  id: string;
  isActive: boolean;
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
    isActive: row.is_active,
    isDefault: row.is_default,
    name: row.name,
    userId: row.user_id,
  };
}
