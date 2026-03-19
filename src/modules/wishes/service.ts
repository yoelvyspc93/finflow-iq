import { supabase } from "@/lib/supabase/client";
import {
  createLocalWish,
  mapWish,
  type CreateWishInput,
  type Wish,
  type WishConfidenceLevel,
} from "@/modules/wishes/types";

type WishListArgs = {
  userId: string;
};

export type SyncWishProjectionInput = {
  confidenceLevel: WishConfidenceLevel | null;
  confidenceReason: string | null;
  estimatedPurchaseDate: string | null;
  lastCalculatedAt: string;
  wishId: string;
};

export async function listWishes({
  userId,
}: WishListArgs): Promise<Wish[]> {
  const { data, error } = await supabase
    .from("wishes")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapWish);
}

export async function syncWishProjections(
  inputs: SyncWishProjectionInput[],
): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  const results = await Promise.all(
    inputs.map((input) =>
      supabase
        .from("wishes")
        .update({
          confidence_level: input.confidenceLevel,
          confidence_reason: input.confidenceReason,
          estimated_purchase_date: input.estimatedPurchaseDate,
          last_calculated_at: input.lastCalculatedAt,
        })
        .eq("id", input.wishId),
    ),
  );

  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw failed.error;
  }
}

export async function createWish(input: CreateWishInput & { userId: string }) {
  const { data, error } = await supabase
    .from("wishes")
    .insert({
      estimated_amount: input.estimatedAmount,
      name: input.name.trim(),
      notes: input.notes ?? null,
      priority: input.priority,
      user_id: input.userId,
      wallet_id: input.walletId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWish(data);
}

export { createLocalWish };
