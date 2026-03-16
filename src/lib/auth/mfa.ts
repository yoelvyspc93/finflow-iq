import { supabase } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
  factor_type: "totp";
  status: "verified" | "unverified";
  friendly_name: string | null;
};

function isTotpFactor(value: unknown): value is TotpFactor {
  if (!value || typeof value !== "object") {
    return false;
  }

  const factor = value as Partial<TotpFactor>;
  return (
    typeof factor.id === "string" &&
    factor.factor_type === "totp" &&
    (factor.status === "verified" || factor.status === "unverified")
  );
}

export async function getPrimaryTotpFactor() {
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    throw error;
  }

  const verified = (data?.totp ?? []).filter(isTotpFactor);
  return verified[0] ?? null;
}

export async function getPendingMfaFactorId() {
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    throw aalError;
  }

  if (aalData.currentLevel === "aal2" || aalData.nextLevel !== "aal2") {
    return null;
  }

  const factor = await getPrimaryTotpFactor();
  return factor?.id ?? null;
}

export async function enrollTotpFactor(friendlyName: string) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: friendlyName.trim() || "FinFlow Authenticator",
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function createTotpChallenge(factorId: string) {
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function verifyTotpChallenge(input: {
  challengeId: string;
  code: string;
  factorId: string;
}) {
  const { data, error } = await supabase.auth.mfa.verify({
    challengeId: input.challengeId,
    code: input.code.trim(),
    factorId: input.factorId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function disableTotpFactor(input: {
  code: string;
  factorId: string;
}) {
  const challenge = await createTotpChallenge(input.factorId);
  await verifyTotpChallenge({
    challengeId: challenge.id,
    code: input.code,
    factorId: input.factorId,
  });

  const { error } = await supabase.auth.mfa.unenroll({
    factorId: input.factorId,
  });

  if (error) {
    throw error;
  }
}

export function toUserFriendlyMfaError(
  error: unknown,
  fallbackMessage: string,
): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("factor") &&
    (message.includes("not found") || message.includes("invalid"))
  ) {
    return "El factor MFA no es valido o ya no existe. Vuelve a configurarlo.";
  }

  if (
    message.includes("challenge") &&
    (message.includes("expired") || message.includes("invalid"))
  ) {
    return "El codigo expiro. Genera un nuevo codigo e intenta otra vez.";
  }

  if (
    message.includes("verification failed") ||
    message.includes("invalid code") ||
    message.includes("token has expired")
  ) {
    return "Codigo incorrecto o expirado. Verifica la hora de tu dispositivo e intenta de nuevo.";
  }

  return error instanceof Error ? error.message : fallbackMessage;
}
