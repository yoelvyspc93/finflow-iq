import { AppState, type AppStateStatus } from "react-native";

import {
  deleteStoredPin,
  hasStoredPin,
  savePin,
  verifyStoredPin,
} from "@/lib/security/pin-storage";
import { useSecurityStore } from "@/stores/security-store";

export async function bootstrapPinState() {
  const { setError, setLoaded, setPinStatus } = useSecurityStore.getState();

  try {
    const exists = await hasStoredPin();
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

export function lockApp() {
  const { pinStatus, setPinStatus } = useSecurityStore.getState();

  if (pinStatus === "unlocked") {
    setPinStatus("locked");
  }
}

export function subscribeToAppLocking() {
  let currentState = AppState.currentState;

  return AppState.addEventListener("change", (nextState: AppStateStatus) => {
    const movedToBackground =
      currentState === "active" &&
      (nextState === "inactive" || nextState === "background");

    if (movedToBackground) {
      lockApp();
    }

    currentState = nextState;
  });
}
