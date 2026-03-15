import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type LockTimeoutMs = 0 | 30000 | 60000 | 300000;

const LOCK_TIMEOUT_KEY = "finflow.lockTimeoutMs";

export const DEFAULT_LOCK_TIMEOUT_MS: LockTimeoutMs = 0;
export const lockTimeoutOptions: {
  description: string;
  label: string;
  value: LockTimeoutMs;
}[] = [
  {
    description: "Bloquea la app apenas sales de ella.",
    label: "Inmediato",
    value: 0,
  },
  {
    description: "Permite cambios rapidos entre pestanas.",
    label: "30 segundos",
    value: 30000,
  },
  {
    description: "Mantiene una pausa corta antes de pedir el PIN.",
    label: "1 minuto",
    value: 60000,
  },
  {
    description: "Deja una ventana mas amplia para multitarea.",
    label: "5 minutos",
    value: 300000,
  },
];

const validLockTimeouts = new Set<LockTimeoutMs>([0, 30000, 60000, 300000]);

const webMemoryStore = new Map<string, string>();

function hasWindow() {
  return typeof window !== "undefined";
}

async function getStoredValue(key: string) {
  if (Platform.OS === "web") {
    if (hasWindow()) {
      return window.localStorage.getItem(key);
    }

    return webMemoryStore.get(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === "web") {
    if (hasWindow()) {
      window.localStorage.setItem(key, value);
      return;
    }

    webMemoryStore.set(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

function asLockTimeoutMs(value: number): LockTimeoutMs {
  return validLockTimeouts.has(value as LockTimeoutMs)
    ? (value as LockTimeoutMs)
    : DEFAULT_LOCK_TIMEOUT_MS;
}

export async function getStoredLockTimeoutMs() {
  const value = await getStoredValue(LOCK_TIMEOUT_KEY);

  if (!value) {
    return DEFAULT_LOCK_TIMEOUT_MS;
  }

  return asLockTimeoutMs(Number(value));
}

export async function saveStoredLockTimeoutMs(lockTimeoutMs: LockTimeoutMs) {
  await setStoredValue(LOCK_TIMEOUT_KEY, String(lockTimeoutMs));
}

export function formatLockTimeout(lockTimeoutMs: LockTimeoutMs) {
  return (
    lockTimeoutOptions.find((option) => option.value === lockTimeoutMs)?.label ??
    "Inmediato"
  );
}
