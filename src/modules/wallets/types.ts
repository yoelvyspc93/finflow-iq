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

export type WalletUpdateInput = Pick<
  TablesUpdate<"wallets">,
  "name" | "currency" | "color" | "icon"
>;

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
