import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Redirect } from "expo-router";

import { clearPin, createPin, unlockWithPin } from "@/lib/security/app-lock";
import { isPinFormatValid } from "@/lib/security/pin-storage";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export default function PinScreen() {
  const [draftPin, setDraftPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authStatus = useAuthStore((state) => state.status);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const securityError = useSecurityStore((state) => state.error);
  const isLoaded = useSecurityStore((state) => state.isLoaded);
  const pinLength = useSecurityStore((state) => state.pinLength);
  const pinStatus = useSecurityStore((state) => state.pinStatus);
  const setError = useSecurityStore((state) => state.setError);
  const setPinLength = useSecurityStore((state) => state.setPinLength);

  const isSetup = pinStatus === "not_setup";
  const currentValue = isSetup ? draftPin : confirmPin;

  const helperText = useMemo(() => {
    if (isSetup) {
      return `Configura un PIN de ${pinLength} dígitos para proteger la app.`;
    }

    return "Por seguridad, confirma tu identidad para entrar.";
  }, [isSetup, pinLength]);

  if (authStatus !== "authenticated") {
    return <Redirect href="/login" />;
  }

  if (isLoaded && pinStatus === "unlocked") {
    return <Redirect href="/" />;
  }

  function appendDigit(digit: string) {
    setError(null);

    if (isSetup) {
      if (draftPin.length >= pinLength) {
        return;
      }
      setDraftPin((value) => value + digit);
      return;
    }

    if (confirmPin.length >= pinLength) {
      return;
    }

    setConfirmPin((value) => value + digit);
  }

  function removeDigit() {
    setError(null);

    if (isSetup) {
      setDraftPin((value) => value.slice(0, -1));
      return;
    }

    setConfirmPin((value) => value.slice(0, -1));
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSetup) {
        if (!isPinFormatValid(draftPin) || draftPin.length !== pinLength) {
          setError(`El PIN debe tener exactamente ${pinLength} dígitos.`);
          return;
        }

        await createPin(draftPin);
        setDraftPin("");
        return;
      }

      if (confirmPin.length !== pinLength) {
        setError(`Introduce los ${pinLength} dígitos del PIN.`);
        return;
      }

      const unlocked = await unlockWithPin(confirmPin);
      if (unlocked) {
        setConfirmPin("");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPin() {
    await clearPin();

    if (isDevBypass) {
      clearAuth();
      return;
    }

    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>FinFlow IQ</Text>
          <Text style={styles.title}>
            {isSetup ? "Configura tu PIN" : "Ingresa tu PIN"}
          </Text>
          <Text style={styles.subtitle}>{helperText}</Text>
        </View>

        <View style={styles.pinDots}>
          {Array.from({ length: pinLength }).map((_, index) => {
            const filled = index < currentValue.length;
            return (
              <View
                key={`pin-dot-${index}`}
                style={[styles.pinDot, filled && styles.pinDotFilled]}
              />
            );
          })}
        </View>

        {isSetup ? (
          <View style={styles.lengthRow}>
            <Pressable
              onPress={() => setPinLength(4)}
              style={[
                styles.lengthButton,
                pinLength === 4 && styles.lengthButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.lengthButtonText,
                  pinLength === 4 && styles.lengthButtonTextActive,
                ]}
              >
                4 dígitos
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPinLength(6)}
              style={[
                styles.lengthButton,
                pinLength === 6 && styles.lengthButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.lengthButtonText,
                  pinLength === 6 && styles.lengthButtonTextActive,
                ]}
              >
                6 dígitos
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => void handleForgotPin()}>
            <Text style={styles.forgotText}>Olvidé mi PIN</Text>
          </Pressable>
        )}

        {securityError ? (
          <Text style={styles.errorText}>{securityError}</Text>
        ) : null}

        <View style={styles.keypad}>
          {keypad.map((digit) => (
            <Pressable
              key={digit}
              onPress={() => appendDigit(digit)}
              style={({ pressed }) => [
                styles.keypadButton,
                pressed && styles.keypadButtonPressed,
              ]}
            >
              <Text style={styles.keypadButtonText}>{digit}</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={removeDigit}
            style={({ pressed }) => [
              styles.keypadButton,
              styles.secondaryButton,
              pressed && styles.keypadButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Borrar</Text>
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.keypadButton,
              styles.submitButton,
              pressed && !isSubmitting && styles.keypadButtonPressed,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {isSetup ? "Guardar" : "Entrar"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090D1A",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  brand: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  pinDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#334155",
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    borderColor: "#4F6BFF",
    backgroundColor: "#4F6BFF",
  },
  lengthRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  lengthButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lengthButtonActive: {
    borderColor: "#4F6BFF",
    backgroundColor: "rgba(79, 107, 255, 0.18)",
  },
  lengthButtonText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  lengthButtonTextActive: {
    color: "#E2E8F0",
  },
  forgotText: {
    color: "#7C8CFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
  },
  keypadButton: {
    width: 96,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#131D34",
    alignItems: "center",
    justifyContent: "center",
  },
  keypadButtonPressed: {
    opacity: 0.85,
  },
  keypadButtonText: {
    color: "#F8FAFC",
    fontSize: 26,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#0F172A",
  },
  secondaryButtonText: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#4F6BFF",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
});
