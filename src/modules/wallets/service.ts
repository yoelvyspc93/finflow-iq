import { supabase } from "@/lib/supabase/client";
import { mapWallet, type Wallet, type WalletCreateInput, type WalletUpdateInput } from "@/modules/wallets/types";

type UserScopedArgs = {
  userId: string;
};

type UpdateWalletArgs = UserScopedArgs & {
  walletId: string;
  patch: WalletUpdateInput;
};

type CreateWalletArgs = UserScopedArgs & {
  input: WalletCreateInput;
};

type DeactivateWalletArgs = UserScopedArgs & {
  walletId: string;
};

export async function listWallets({ userId }: UserScopedArgs): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapWallet);
}

export async function createWallet({
  input,
  userId,
}: CreateWalletArgs): Promise<Wallet> {
  const payload = {
    color: input.color ?? null,
    currency: input.currency.trim(),
    icon: input.icon ?? null,
    name: input.name.trim(),
    position: input.position ?? 0,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("wallets")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWallet(data);
}

export async function updateWallet({
  patch,
  userId,
  walletId,
}: UpdateWalletArgs): Promise<Wallet> {
  const payload = {
    color: patch.color,
    icon: patch.icon,
    name: patch.name?.trim(),
  };

  const { data, error } = await supabase
    .from("wallets")
    .update(payload)
    .eq("id", walletId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWallet(data);
}

export async function deactivateWallet({
  userId,
  walletId,
}: DeactivateWalletArgs): Promise<Wallet> {
  const { data, error } = await supabase
    .from("wallets")
    .update({ is_active: false })
    .eq("id", walletId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWallet(data);
}
