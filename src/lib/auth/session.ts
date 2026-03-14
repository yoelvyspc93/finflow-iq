import * as Linking from "expo-linking";

import { supabase } from "@/lib/supabase/client";

type SupportedOtpType =
  | "email"
  | "recovery"
  | "invite"
  | "email_change"
  | "magiclink"
  | "signup";

type ParsedAuthUrl = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenHash: string | null;
  type: SupportedOtpType | null;
  errorDescription: string | null;
};

export function getAuthRedirectUrl() {
  return Linking.createURL("callback");
}

export async function sendMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
}

function parseOtpType(rawType: string | null): SupportedOtpType | null {
  if (
    rawType === "email" ||
    rawType === "recovery" ||
    rawType === "invite" ||
    rawType === "email_change" ||
    rawType === "magiclink" ||
    rawType === "signup"
  ) {
    return rawType;
  }

  return null;
}

function mergeParams(source: URLSearchParams, target: URLSearchParams) {
  for (const [key, value] of source.entries()) {
    target.set(key, value);
  }
}

function parseAuthUrl(url: string): ParsedAuthUrl {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);
  const hash = parsedUrl.hash.startsWith("#")
    ? parsedUrl.hash.slice(1)
    : parsedUrl.hash;

  if (hash) {
    mergeParams(new URLSearchParams(hash), params);
  }

  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    tokenHash: params.get("token_hash"),
    type: parseOtpType(params.get("type")),
    errorDescription:
      params.get("error_description") || params.get("error") || null,
  };
}

export async function applyAuthRedirectUrl(url: string) {
  const { accessToken, refreshToken, tokenHash, type, errorDescription } =
    parseAuthUrl(url);

  if (errorDescription) {
    return { error: new Error(decodeURIComponent(errorDescription)) };
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return { error: error ?? null };
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type ?? "email",
    });

    return { error: error ?? null };
  }

  return { error: null };
}
