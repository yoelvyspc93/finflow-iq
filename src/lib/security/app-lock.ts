import { AppState, Platform, type AppStateStatus } from "react-native";

import {
  deleteStoredPin,
  hasStoredPin,
  savePin,
  verifyStoredPin,
} from "@/lib/security/pin-storage";
import {
  getStoredLockTimeoutMs,
  saveStoredLockTimeoutMs,
  type LockTimeoutMs,
} from "@/lib/security/security-preferences";
import { useSecurityStore } from "@/stores/security-store";

export async function bootstrapPinState() {
  const { setError, setLoaded, setLockTimeoutMs, setPinStatus } =
    useSecurityStore.getState();

  try {
    const [exists, lockTimeoutMs] = await Promise.all([
      hasStoredPin(),
      getStoredLockTimeoutMs(),
    ]);

    setLockTimeoutMs(lockTimeoutMs);
    setPinStatus(exists ? "locked" : "not_setup");
    setError(null);
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "No se pudo leer el estado del PIN.",
    );
    setPinStatus("not_setup");
  } finally {
    setLoaded(true);
  }
}

export async function createPin(pin: string) {
  const { setError, setPinStatus } = useSecurityStore.getState();
  await savePin(pin);
  setError(null);
  setPinStatus("unlocked");
}

export async function unlockWithPin(pin: string) {
  const { setError, setPinStatus } = useSecurityStore.getState();
  const isValid = await verifyStoredPin(pin);

  if (!isValid) {
    setError("PIN incorrecto.");
    return false;
  }

  setError(null);
  setPinStatus("unlocked");
  return true;
}

export async function clearPin() {
  const { setError, setPinStatus } = useSecurityStore.getState();
  await deleteStoredPin();
  setError(null);
  setPinStatus("not_setup");
}

export async function updateLockTimeout(lockTimeoutMs: LockTimeoutMs) {
  const { setError, setLockTimeoutMs } = useSecurityStore.getState();
  await saveStoredLockTimeoutMs(lockTimeoutMs);
  setError(null);
  setLockTimeoutMs(lockTimeoutMs);
}

export function lockApp() {
  const { pinStatus, setPinStatus } = useSecurityStore.getState();

  if (pinStatus === "unlocked") {
    setPinStatus("locked");
  }
}

function shouldLockAfterElapsed(elapsedMs: number) {
  const { lockTimeoutMs } = useSecurityStore.getState();

  if (lockTimeoutMs === 0) {
    return true;
  }

  return elapsedMs >= lockTimeoutMs;
}

export function subscribeToAppLocking() {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();

        if (shouldLockAfterElapsed(0)) {
          lockApp();
        }

        return;
      }

      if (document.visibilityState === "visible" && hiddenAt !== null) {
        if (shouldLockAfterElapsed(Date.now() - hiddenAt)) {
          lockApp();
        }

        hiddenAt = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return {
      remove() {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      },
    };
  }

  let currentState = AppState.currentState;
  let backgroundedAt: number | null = null;

  return AppState.addEventListener("change", (nextState: AppStateStatus) => {
    const movedToBackground =
      currentState === "active" &&
      (nextState === "inactive" || nextState === "background");
    const movedToForeground =
      (currentState === "inactive" || currentState === "background") &&
      nextState === "active";

    if (movedToBackground) {
      backgroundedAt = Date.now();

      if (shouldLockAfterElapsed(0)) {
        lockApp();
      }
    }

    if (movedToForeground && backgroundedAt !== null) {
      if (shouldLockAfterElapsed(Date.now() - backgroundedAt)) {
        lockApp();
      }

      backgroundedAt = null;
    }

    currentState = nextState;
  });
}
