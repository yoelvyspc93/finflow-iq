import type { Tables } from "@/types/supabase";

export type WishRow = Tables<"wishes">;

export type WishConfidenceLevel =
  | "high"
  | "medium"
  | "low"
  | "risky";

export type Wish = {
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
    priority: row.priority,
    purchasedAt: row.purchased_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    walletId: row.wallet_id,
  };
}

export function createMockWishes(userId: string): Wish[] {
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  return [
    {
      aiAdvice: null,
      confidenceLevel: null,
      confidenceReason: null,
      createdAt: now.toISOString(),
      estimatedAmount: 350,
      estimatedPurchaseDate: null,
      id: "mock-wish-headphones",
      isPurchased: false,
      lastAiAdviceAt: null,
      lastCalculatedAt: null,
      name: "Sony WH-1000XM5",
      notes: "Esperar una oferta de tienda oficial",
      priority: 1,
      purchasedAt: null,
      updatedAt: now.toISOString(),
      userId,
      walletId: "dev-wallet-primary",
    },
    {
      aiAdvice: null,
      confidenceLevel: null,
      confidenceReason: null,
      createdAt: now.toISOString(),
      estimatedAmount: 1600,
      estimatedPurchaseDate: null,
      id: "mock-wish-chair",
      isPurchased: false,
      lastAiAdviceAt: null,
      lastCalculatedAt: null,
      name: "Silla ergonomica",
      notes: "Compra grande para home office",
      priority: 2,
      purchasedAt: null,
      updatedAt: now.toISOString(),
      userId,
      walletId: "dev-wallet-primary",
    },
    {
      aiAdvice: null,
      confidenceLevel: "high",
      confidenceReason: "Ya fue comprada y cerrada.",
      createdAt: now.toISOString(),
      estimatedAmount: 120,
      estimatedPurchaseDate: `${currentYear}-01-10`,
      id: "mock-wish-kindle",
      isPurchased: true,
      lastAiAdviceAt: null,
      lastCalculatedAt: now.toISOString(),
      name: "Kindle Paperwhite",
      notes: "Completado con ahorro del primer trimestre",
      priority: 3,
      purchasedAt: `${currentYear}-01-12T10:00:00.000Z`,
      updatedAt: now.toISOString(),
      userId,
      walletId: "dev-wallet-primary",
    },
  ];
}

export function createLocalWish(input: CreateWishInput & { userId: string }): Wish {
  const now = new Date().toISOString();

  return {
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
    priority: input.priority,
    purchasedAt: null,
    updatedAt: now,
    userId: input.userId,
    walletId: input.walletId,
  };
}
