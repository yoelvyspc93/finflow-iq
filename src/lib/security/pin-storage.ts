import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PIN_KEY = "finflow.pin";

const webMemoryStore = new Map<string, string>();

function hasWindow() {
  return typeof window !== "undefined";
}

async function getWebItem(key: string) {
  if (hasWindow()) {
    return window.localStorage.getItem(key);
  }

  return webMemoryStore.get(key) ?? null;
}

async function setWebItem(key: string, value: string) {
  if (hasWindow()) {
    window.localStorage.setItem(key, value);
    return;
  }

  webMemoryStore.set(key, value);
}

async function deleteWebItem(key: string) {
  if (hasWindow()) {
    window.localStorage.removeItem(key);
    return;
  }

  webMemoryStore.delete(key);
}

async function readRawPin() {
  if (Platform.OS === "web") {
    return getWebItem(PIN_KEY);
  }

  return SecureStore.getItemAsync(PIN_KEY);
}

async function writeRawPin(pin: string) {
  if (Platform.OS === "web") {
    await setWebItem(PIN_KEY, pin);
    return;
  }

  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function deleteStoredPin() {
  if (Platform.OS === "web") {
    await deleteWebItem(PIN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(PIN_KEY);
}

export function isPinFormatValid(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export async function hasStoredPin() {
  const value = await readRawPin();
  return Boolean(value);
}

export async function savePin(pin: string) {
  if (!isPinFormatValid(pin)) {
    throw new Error("El PIN debe tener entre 4 y 6 dígitos.");
  }

  await writeRawPin(pin);
}

export async function verifyStoredPin(pin: string) {
  const savedPin = await readRawPin();
  return savedPin === pin;
}
