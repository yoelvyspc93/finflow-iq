import type { Tables } from "@/types/supabase";

export type WishRow = Tables<"wishes">;

export type WishConfidenceLevel =
  | "high"
  | "medium"
  | "low"
  | "risky";

export type Wish = {
  actualPurchaseAmount: number | null;
  aiAdvice: string | null;
  confidenceLevel: WishConfidenceLevel | null;
  confidenceReason: string | null;
  createdAt: string;
  estimatedAmount: number;
  estimatedPurchaseDate: string | null;
  id: string;
  isPurchased: boolean;
  lastAiAdviceAt: string | null;
  lastCalculatedAt: string | null;
  name: string;
  notes: string | null;
  purchaseLedgerEntryId: string | null;
  priority: number;
  purchasedAt: string | null;
  updatedAt: string;
  userId: string;
  walletId: string;
};

export type CreateWishInput = {
  estimatedAmount: number;
  name: string;
  notes?: string | null;
  priority: number;
  walletId: string;
};

export function mapWish(row: WishRow): Wish {
  return {
    actualPurchaseAmount: row.actual_purchase_amount,
    aiAdvice: row.ai_advice,
    confidenceLevel: row.confidence_level as WishConfidenceLevel | null,
    confidenceReason: row.confidence_reason,
    createdAt: row.created_at,
    estimatedAmount: row.estimated_amount,
    estimatedPurchaseDate: row.estimated_purchase_date,
    id: row.id,
    isPurchased: row.is_purchased,
    lastAiAdviceAt: row.last_ai_advice_at,
    lastCalculatedAt: row.last_calculated_at,
    name: row.name,
    notes: row.notes,
    purchaseLedgerEntryId: row.purchase_ledger_entry_id,
    priority: row.priority,
    purchasedAt: row.purchased_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function createLocalWish(input: CreateWishInput & { userId: string }): Wish {
  const now = new Date().toISOString();

  return {
    actualPurchaseAmount: null,
    aiAdvice: null,
    confidenceLevel: null,
    confidenceReason: null,
    createdAt: now,
    estimatedAmount: input.estimatedAmount,
    estimatedPurchaseDate: null,
    id: `local-wish-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    isPurchased: false,
    lastAiAdviceAt: null,
    lastCalculatedAt: null,
    name: input.name.trim(),
    notes: input.notes ?? null,
    purchaseLedgerEntryId: null,
    priority: input.priority,
    purchasedAt: null,
    updatedAt: now,
    userId: input.userId,
    walletId: input.walletId,
  };
}
