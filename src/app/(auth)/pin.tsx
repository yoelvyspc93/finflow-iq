import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import Animated, {
  Easing,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { createPin, unlockWithPin } from "@/lib/security/app-lock";
import { isPinFormatValid } from "@/lib/security/pin-storage";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";

const keypadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

function AnimatedPinDot({
  filled,
  invalidProgress,
}: {
  filled: boolean;
  invalidProgress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      invalidProgress.value,
      [0, 1],
      [filled ? "#4B69FF" : "rgba(97, 113, 151, 0.62)", "#F87171"],
    );
    const backgroundColor = interpolateColor(
      invalidProgress.value,
      [0, 1],
      [filled ? "#4B69FF" : "rgba(0, 0, 0, 0)", "rgba(248, 113, 113, 0.18)"],
    );

    return {
      borderColor,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.pinDot, filled && styles.pinDotFilled, animatedStyle]} />;
}

export default function PinScreen() {
  const [draftPin, setDraftPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clearPinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authStatus = useAuthStore((state) => state.status);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const securityError = useSecurityStore((state) => state.error);
  const isLoaded = useSecurityStore((state) => state.isLoaded);
  const pinLength = useSecurityStore((state) => state.pinLength);
  const pinStatus = useSecurityStore((state) => state.pinStatus);
  const setError = useSecurityStore((state) => state.setError);
  const setPinLength = useSecurityStore((state) => state.setPinLength);

  const shakeX = useSharedValue(0);
  const invalidProgress = useSharedValue(0);

  const isSetup = pinStatus === "not_setup";
  const currentValue = isSetup ? draftPin : confirmPin;
  const visibleSecurityError =
    securityError === "PIN incorrecto." ? null : securityError;

  const helperText = useMemo(() => {
    if (isSetup) {
      return `Configura un PIN de ${pinLength} digitos para proteger la app.`;
    }

    return "Por seguridad, confirma tu identidad";
  }, [isSetup, pinLength]);

  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function clearCurrentPin() {
    if (isSetup) {
      setDraftPin("");
      return;
    }

    setConfirmPin("");
  }

  function triggerInvalidPinFeedback() {
    if (clearPinTimeoutRef.current) {
      clearTimeout(clearPinTimeoutRef.current);
    }

    clearPinTimeoutRef.current = setTimeout(() => {
      clearCurrentPin();
      clearPinTimeoutRef.current = null;
    }, 260);

    invalidProgress.value = withSequence(
      withTiming(1, { duration: 110 }),
      withTiming(0, { duration: 180 }),
    );
    shakeX.value = withSequence(
      withTiming(-8, { duration: 45, easing: Easing.linear }),
      withTiming(8, { duration: 55, easing: Easing.linear }),
      withTiming(-6, { duration: 50, easing: Easing.linear }),
      withTiming(6, { duration: 50, easing: Easing.linear }),
      withTiming(0, { duration: 45, easing: Easing.linear }),
    );
  }

  function appendDigit(digit: string) {
    if (isSubmitting) {
      return;
    }

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
    if (isSubmitting) {
      return;
    }

    setError(null);

    if (isSetup) {
      setDraftPin((value) => value.slice(0, -1));
      return;
    }

    setConfirmPin((value) => value.slice(0, -1));
  }

  const submitPin = useEffectEvent(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSetup) {
        if (!isPinFormatValid(draftPin) || draftPin.length !== pinLength) {
          setError(`El PIN debe tener exactamente ${pinLength} digitos.`);
          return;
        }

        await createPin(draftPin);
        setDraftPin("");
        return;
      }

      if (confirmPin.length !== pinLength) {
        return;
      }

      const unlocked = await unlockWithPin(confirmPin);

      if (unlocked) {
        setConfirmPin("");
        return;
      }

      triggerInvalidPinFeedback();
    } finally {
      setIsSubmitting(false);
    }
  });

  useEffect(() => {
    if (currentValue.length !== pinLength) {
      return;
    }

    void submitPin();
  }, [currentValue, pinLength, submitPin]);

  useEffect(() => {
    return () => {
      if (clearPinTimeoutRef.current) {
        clearTimeout(clearPinTimeoutRef.current);
      }
    };
  }, []);

  if (authStatus !== "authenticated") {
    return <Redirect href="/login" />;
  }

  if (isLoaded && pinStatus === "unlocked") {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.brandWrap}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Image
                contentFit="contain"
                source={require("../../../assets/logo.png")}
                style={styles.brandImage}
              />
            </View>
            <Text style={styles.brandText}>FinFlow IQ</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.centerBlock}>
          <View style={styles.header}>
            <Text style={styles.title}>{isSetup ? "Configura tu PIN" : "Ingresa tu PIN"}</Text>
            <Text style={styles.subtitle}>{helperText}</Text>
          </View>

          <Animated.View style={[styles.pinDots, dotsAnimatedStyle]}>
            {Array.from({ length: pinLength }).map((_, index) => {
              const filled = index < currentValue.length;

              return (
                <AnimatedPinDot
                  key={`pin-dot-${index}`}
                  filled={filled}
                  invalidProgress={invalidProgress}
                />
              );
            })}
          </Animated.View>

          {!isSetup ? (
            <Pressable onPress={clearAuth} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.forgotText}>Olvide mi PIN?</Text>
            </Pressable>
          ) : (
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
                  4 digitos
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
                  6 digitos
                </Text>
              </Pressable>
            </View>
          )}

          {visibleSecurityError ? (
            <Text style={styles.errorText}>{visibleSecurityError}</Text>
          ) : null}
        </View>

        <View style={styles.keypad}>
          {keypadRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.keypadRow}>
              {row.map((digit) => (
                <Pressable
                  key={digit}
                  onPress={() => appendDigit(digit)}
                  style={({ pressed }) => [
                    styles.keypadButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.keypadButtonText}>{digit}</Text>
                </Pressable>
              ))}
            </View>
          ))}

          <View style={styles.keypadRow}>
            <View style={styles.keypadSpacer} />
            <Pressable
              onPress={() => appendDigit("0")}
              style={({ pressed }) => [
                styles.keypadButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.keypadButtonText}>0</Text>
            </Pressable>
            <Pressable
              onPress={removeDigit}
              style={({ pressed }) => [
                styles.keypadButton,
                styles.eraseButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color="#E3E9F7"
                name="backspace-outline"
                size={22}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B1020",
  },
  container: {
    flex: 1,
  },
  brandWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(58, 96, 255, 0.18)",
  },
  brandImage: {
    width: 15,
    height: 15,
  },
  brandText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(132, 147, 188, 0.12)",
  },
  centerBlock: {
    alignItems: "center",
    marginTop: 76,
    marginBottom: 28,
    gap: 28,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#7F8CA8",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  pinDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(97, 113, 151, 0.62)",
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    borderColor: "#4B69FF",
    backgroundColor: "#4B69FF",
    shadowColor: "#4B69FF",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  forgotText: {
    color: "#4B69FF",
    fontSize: 16,
    fontWeight: "700",
  },
  lengthRow: {
    flexDirection: "row",
    gap: 12,
  },
  lengthButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(95, 112, 151, 0.32)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(18, 24, 42, 0.84)",
  },
  lengthButtonActive: {
    borderColor: "#4B69FF",
    backgroundColor: "rgba(75, 105, 255, 0.16)",
  },
  lengthButtonText: {
    color: "#8D9ABB",
    fontSize: 13,
    fontWeight: "700",
  },
  lengthButtonTextActive: {
    color: "#F8FAFC",
  },
  errorText: {
    color: "#F7A9AA",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  keypad: {
    gap: 14,
    paddingHorizontal: 20,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  keypadButton: {
    flex: 1,
    height: 68,
    borderRadius: 12,
    backgroundColor: "rgba(22, 30, 50, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(111, 127, 168, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  keypadButtonText: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "800",
  },
  keypadSpacer: {
    flex: 1,
  },
  eraseButton: {
    backgroundColor: "rgba(20, 27, 46, 0.90)",
  },
  pressed: {
    opacity: 0.84,
  },
});
