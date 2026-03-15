import type { Wish, WishConfidenceLevel } from "@/modules/wishes/types";

export type WishProjection = {
  confidenceLevel: WishConfidenceLevel;
  confidenceReason: string;
  estimatedPurchaseDate: string | null;
  monthsUntilPurchase: number | null;
  progressRatio: number;
  wish: Wish;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function addMonths(date: string, months: number) {
  const reference = new Date(`${date}T00:00:00.000Z`);
  reference.setUTCDate(1);
  reference.setUTCMonth(reference.getUTCMonth() + months);
  return reference.toISOString().slice(0, 10);
}

function describeConfidence(args: {
  estimatedDate: string | null;
  monthlySavingCapacity: number;
  monthsUntilPurchase: number | null;
  salaryStabilityScore: number;
}) {
  if (!args.estimatedDate || args.monthlySavingCapacity <= 0) {
    return {
      confidenceLevel: "risky" as WishConfidenceLevel,
      confidenceReason:
        "No queda ahorro mensual asignable despues de compromisos y reserva.",
    };
  }

  if ((args.monthsUntilPurchase ?? 0) <= 1 && args.salaryStabilityScore >= 75) {
    return {
      confidenceLevel: "high" as WishConfidenceLevel,
      confidenceReason: "Se puede comprar casi de inmediato con flujo estable.",
    };
  }

  if ((args.monthsUntilPurchase ?? 0) <= 3 && args.salaryStabilityScore >= 60) {
    return {
      confidenceLevel: "medium" as WishConfidenceLevel,
      confidenceReason:
        "La compra depende de mantener el ritmo actual de ahorro por pocos meses.",
    };
  }

  if ((args.monthsUntilPurchase ?? 0) <= 6) {
    return {
      confidenceLevel: "low" as WishConfidenceLevel,
      confidenceReason:
        "La compra es alcanzable, pero cualquier retraso de ingresos la mueve.",
    };
  }

  return {
    confidenceLevel: "risky" as WishConfidenceLevel,
    confidenceReason:
      "La presion acumulada de prioridades hace esta compra fragil por ahora.",
  };
}

export function calculateWishProjections(args: {
  assignableAmount: number;
  monthlySavingCapacity: number;
  referenceDate?: string;
  salaryStabilityScore: number;
  wishes: Wish[];
}): WishProjection[] {
  const referenceDate =
    args.referenceDate ?? new Date().toISOString().slice(0, 10);
  const orderedWishes = [...args.wishes].sort(
    (left, right) => left.priority - right.priority,
  );

  let cumulativePendingCost = 0;

  return orderedWishes.map<WishProjection>((wish) => {
    if (wish.isPurchased) {
      return {
        confidenceLevel: "high",
        confidenceReason: "Compra ya completada.",
        estimatedPurchaseDate:
          wish.purchasedAt?.slice(0, 10) ?? wish.estimatedPurchaseDate,
        monthsUntilPurchase: 0,
        progressRatio: 1,
        wish,
      };
    }

    const costBeforeThisWish = cumulativePendingCost;
    cumulativePendingCost += wish.estimatedAmount;

    const currentCoverage = Math.max(0, args.assignableAmount - costBeforeThisWish);
    const progressRatio = clamp(currentCoverage / wish.estimatedAmount, 0, 1);
    const remainingBacklog = Math.max(
      0,
      cumulativePendingCost - args.assignableAmount,
    );
    const monthsUntilPurchase =
      remainingBacklog <= 0
        ? 0
        : args.monthlySavingCapacity > 0
          ? Math.ceil(remainingBacklog / args.monthlySavingCapacity)
          : null;
    const estimatedPurchaseDate =
      monthsUntilPurchase === null
        ? null
        : addMonths(referenceDate, monthsUntilPurchase);
    const confidence = describeConfidence({
      estimatedDate: estimatedPurchaseDate,
      monthlySavingCapacity: args.monthlySavingCapacity,
      monthsUntilPurchase,
      salaryStabilityScore: args.salaryStabilityScore,
    });

    return {
      confidenceLevel: confidence.confidenceLevel,
      confidenceReason: confidence.confidenceReason,
      estimatedPurchaseDate,
      monthsUntilPurchase,
      progressRatio,
      wish,
    };
  });
}
