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

type SetWalletActiveArgs = UserScopedArgs & {
  walletId: string;
};

type DeleteWalletArgs = UserScopedArgs & {
  walletId: string;
};

export type WalletReferenceSummary = {
  hasOperations: boolean;
  operationsCount: number;
  totalReferences: number;
};

async function countRows(
  queryBuilder: PromiseLike<{ count: number | null; error: unknown }>,
) {
  const { count, error } = await queryBuilder;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

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
    currency: patch.currency?.trim(),
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

export async function activateWallet({
  userId,
  walletId,
}: SetWalletActiveArgs): Promise<Wallet> {
  const { data, error } = await supabase
    .from("wallets")
    .update({ is_active: true })
    .eq("id", walletId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWallet(data);
}

export async function deleteWallet({
  userId,
  walletId,
}: DeleteWalletArgs): Promise<void> {
  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", walletId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getWalletReferenceSummary({
  userId,
  walletId,
}: DeleteWalletArgs): Promise<WalletReferenceSummary> {
  const [ledgerEntries, salaryPayments, recurringExpenses, budgetProvisions, goals, goalContributions, wishes, exchangesFrom, exchangesTo] =
    await Promise.all([
      countRows(
        supabase
          .from("ledger_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("salary_payments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("recurring_expenses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("budget_provisions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("goals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("goal_contributions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("wishes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("currency_exchanges")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("from_wallet_id", walletId),
      ),
      countRows(
        supabase
          .from("currency_exchanges")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("to_wallet_id", walletId),
      ),
    ]);

  const operationsCount = ledgerEntries + salaryPayments + exchangesFrom + exchangesTo;
  const totalReferences =
    ledgerEntries +
    salaryPayments +
    recurringExpenses +
    budgetProvisions +
    goals +
    goalContributions +
    wishes +
    exchangesFrom +
    exchangesTo;

  return {
    hasOperations: operationsCount > 0,
    operationsCount,
    totalReferences,
  };
}
