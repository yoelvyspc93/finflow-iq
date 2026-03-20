import type { Tables } from "@/types/supabase";

export type IncomeSourceRow = Tables<"income_sources">;

export type IncomeSource = {
  createdAt: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  userId: string;
};

export function mapIncomeSource(row: IncomeSourceRow): IncomeSource {
  return {
    createdAt: row.created_at,
    id: row.id,
    isActive: row.is_active,
    isDefault: row.is_default,
    name: row.name,
    userId: row.user_id,
  };
}
