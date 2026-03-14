import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type WalletRow = Tables<"wallets">;

export type Wallet = {
  balance: number;
  color: string | null;
  createdAt: string;
  currency: string;
  icon: string | null;
  id: string;
  isActive: boolean;
  name: string;
  position: number;
  updatedAt: string;
  userId: string;
};

export type WalletCreateInput = Pick<
  TablesInsert<"wallets">,
  "name" | "currency" | "color" | "icon"
> & {
  position?: number;
};

export type WalletUpdateInput = Pick<TablesUpdate<"wallets">, "name" | "color" | "icon">;

export function mapWallet(row: WalletRow): Wallet {
  return {
    balance: row.balance,
    color: row.color,
    createdAt: row.created_at,
    currency: row.currency,
    icon: row.icon,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    position: row.position,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function createMockWallet(input: {
  color?: string | null;
  currency: string;
  icon?: string | null;
  name: string;
  position?: number;
  userId: string;
}): Wallet {
  const now = new Date().toISOString();

  return {
    balance: 0,
    color: input.color ?? null,
    createdAt: now,
    currency: input.currency,
    icon: input.icon ?? null,
    id: "dev-wallet-primary",
    isActive: true,
    name: input.name.trim(),
    position: input.position ?? 0,
    updatedAt: now,
    userId: input.userId,
  };
}
