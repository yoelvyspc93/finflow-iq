import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Redirect, router } from "expo-router";

import {
  createTotpChallenge,
  toUserFriendlyMfaError,
  verifyTotpChallenge,
} from "@/lib/auth/mfa";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";

export default function MfaScreen() {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authStatus = useAuthStore((state) => state.status);
  const pendingMfaFactorId = useAuthStore((state) => state.pendingMfaFactorId);
  const setPendingMfaFactorId = useAuthStore((state) => state.setPendingMfaFactorId);
  const setMfa = useSecurityStore((state) => state.setMfa);

  if (authStatus !== "authenticated") {
    return <Redirect href="/login" />;
  }

  if (!pendingMfaFactorId) {
    return <Redirect href="/" />;
  }

  async function handleVerify() {
    const factorId = pendingMfaFactorId;
    if (!factorId) {
      setError("No hay factor MFA pendiente.");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Escribe un codigo de 6 digitos.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const challenge = await createTotpChallenge(factorId);
      await verifyTotpChallenge({
        challengeId: challenge.id,
        code,
        factorId,
      });

      setMfa({
        factorId,
        isEnabled: true,
      });
      setPendingMfaFactorId(null);
      router.replace("/");
    } catch (caughtError) {
      setError(toUserFriendlyMfaError(caughtError, "No se pudo validar el codigo MFA."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Verificacion MFA</Text>
          <Text style={styles.subtitle}>
            Ingresa el codigo de 6 digitos de tu app autenticadora.
          </Text>

          <TextInput
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor="#65728E"
            style={styles.codeInput}
            value={code}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={() => {
              void handleVerify();
            }}
            style={({ pressed }) => [
              styles.button,
              isSubmitting && styles.buttonDisabled,
              pressed && !isSubmitting && styles.pressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#F8FAFC" />
            ) : (
              <Text style={styles.buttonText}>Verificar codigo</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1020" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(72, 97, 173, 0.16)",
    backgroundColor: "rgba(21, 28, 47, 0.90)",
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
  },
  title: { color: "#F8FAFC", fontSize: 24, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#7F8AA6", fontSize: 14, textAlign: "center" },
  codeInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(115, 128, 167, 0.18)",
    backgroundColor: "rgba(17, 22, 39, 0.92)",
    color: "#F8FAFC",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  errorText: { color: "#F6A6A8", fontSize: 13, lineHeight: 20 },
  button: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#4A66FF",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.88 },
});
