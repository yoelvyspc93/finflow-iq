import type { Tables } from "@/types/supabase";

export type IncomeSourceRow = Tables<"income_sources">;

export type IncomeSource = {
  createdAt: string;
  id: string;
  isDefault: boolean;
  name: string;
  userId: string;
};

export function mapIncomeSource(row: IncomeSourceRow): IncomeSource {
  return {
    createdAt: row.created_at,
    id: row.id,
    isDefault: row.is_default,
    name: row.name,
    userId: row.user_id,
  };
}

export function createMockIncomeSources(userId: string): IncomeSource[] {
  const now = new Date().toISOString();

  return [
    {
      createdAt: now,
      id: "mock-income-freelance",
      isDefault: true,
      name: "Freelance",
      userId,
    },
    {
      createdAt: now,
      id: "mock-income-salary",
      isDefault: true,
      name: "Salario",
      userId,
    },
    {
      createdAt: now,
      id: "mock-income-transfer",
      isDefault: true,
      name: "Transferencia",
      userId,
    },
  ];
}
