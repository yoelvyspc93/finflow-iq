import { Platform } from "react-native";

export type WebAuthSessionPayload = {
  accessToken: string;
  refreshToken: string;
  issuedAt: number;
};

const AUTH_SESSION_CHANNEL = "finflowiq-auth-session";
const AUTH_SESSION_STORAGE_KEY = "finflowiq:auth-session";

function isWebBrowser() {
  return Platform.OS === "web" && typeof window !== "undefined";
}

function parsePayload(
  value: string | WebAuthSessionPayload | null | undefined,
): WebAuthSessionPayload | null {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as WebAuthSessionPayload;
  } catch {
    return null;
  }
}

export function readStoredWebAuthSession() {
  if (!isWebBrowser()) {
    return null;
  }

  return parsePayload(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY));
}

export function clearStoredWebAuthSession() {
  if (!isWebBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function publishWebAuthSession(payload: WebAuthSessionPayload) {
  if (!isWebBrowser()) {
    return;
  }

  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(payload),
  );

  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(AUTH_SESSION_CHANNEL);
  channel.postMessage(payload);
  channel.close();
}

export function subscribeToWebAuthSession(
  listener: (payload: WebAuthSessionPayload) => void,
) {
  if (!isWebBrowser()) {
    return () => undefined;
  }

  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(AUTH_SESSION_CHANNEL);

  function handlePayload(value: string | WebAuthSessionPayload | null) {
    const payload = parsePayload(value);

    if (payload) {
      listener(payload);
    }
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === AUTH_SESSION_STORAGE_KEY && event.newValue) {
      handlePayload(event.newValue);
    }
  }

  channel?.addEventListener("message", (event) => {
    handlePayload(event.data as WebAuthSessionPayload | null);
  });
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}
