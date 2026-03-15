import * as Linking from "expo-linking";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase/client";
import { publishWebAuthSession } from "@/lib/auth/web-session-bridge";

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

const webRouteSegments = new Set([
  "callback",
  "dashboard",
  "finances",
  "login",
  "onboarding",
  "pin",
  "planning",
  "settings",
]);

function getWebBasePath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "");

  if (!normalizedPath) {
    return "";
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);

  if (lastSegment && webRouteSegments.has(lastSegment)) {
    segments.pop();
  }

  return segments.length > 0 ? `/${segments.join("/")}` : "";
}

function buildWebCallbackUrl(source: URL) {
  const callbackPath = `${getWebBasePath(source.pathname)}/callback`.replace(
    /\/{2,}/g,
    "/",
  );

  return new URL(callbackPath, source.origin).toString();
}

function isLocalHostName(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function getConfiguredWebRedirectUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim();

  if (!configuredUrl) {
    return null;
  }

  try {
    const parsedConfiguredUrl = new URL(configuredUrl);

    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      const currentIsLocal = isLocalHostName(currentUrl.hostname);
      const configuredIsLocal = isLocalHostName(parsedConfiguredUrl.hostname);

      if (currentIsLocal !== configuredIsLocal) {
        return null;
      }
    }

    return buildWebCallbackUrl(parsedConfiguredUrl);
  } catch {
    return null;
  }
}

export function getAuthRedirectUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return (
      getConfiguredWebRedirectUrl() ??
      buildWebCallbackUrl(new URL(window.location.href))
    );
  }

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

    if (!error) {
      publishWebAuthSession({
        accessToken,
        refreshToken,
        issuedAt: Date.now(),
      });
    }

    return { error: error ?? null };
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type ?? "email",
    });

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && session.refresh_token) {
        publishWebAuthSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          issuedAt: Date.now(),
        });
      }
    }

    return { error: error ?? null };
  }

  return { error: null };
}
