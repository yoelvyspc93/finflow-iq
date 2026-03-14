import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Redirect } from "expo-router";

import { sendMagicLink } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const authError = useAuthStore((state) => state.error);
  const enableDevBypass = useAuthStore((state) => state.enableDevBypass);
  const isReady = useAuthStore((state) => state.isReady);
  const lastMagicLinkEmail = useAuthStore((state) => state.lastMagicLinkEmail);
  const magicLinkCooldownUntil = useAuthStore(
    (state) => state.magicLinkCooldownUntil,
  );
  const setError = useAuthStore((state) => state.setError);
  const setLastMagicLinkEmail = useAuthStore(
    (state) => state.setLastMagicLinkEmail,
  );
  const setMagicLinkCooldownUntil = useAuthStore(
    (state) => state.setMagicLinkCooldownUntil,
  );
  const status = useAuthStore((state) => state.status);
  const pinStatus = useSecurityStore((state) => state.pinStatus);

  const isDevBypassEnabled = __DEV__;

  const canSubmit = useMemo(
    () =>
      isSupabaseConfigured &&
      isValidEmail(email) &&
      !isSubmitting &&
      remainingSeconds <= 0,
    [email, isSubmitting, remainingSeconds],
  );

  useEffect(() => {
    if (!magicLinkCooldownUntil) {
      setRemainingSeconds(0);
      return;
    }

    const cooldownUntil = magicLinkCooldownUntil;

    function syncCooldown() {
      const seconds = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000),
      );

      setRemainingSeconds(seconds);

      if (seconds <= 0) {
        setMagicLinkCooldownUntil(null);
      }
    }

    syncCooldown();
    const timer = setInterval(syncCooldown, 1000);

    return () => clearInterval(timer);
  }, [magicLinkCooldownUntil, setMagicLinkCooldownUntil]);

  if (isReady && status === "authenticated") {
    return <Redirect href={pinStatus === "unlocked" ? "/" : "/pin"} />;
  }

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setFeedback("Escribe un correo válido.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    const { error } = await sendMagicLink(normalizedEmail);

    if (error) {
      const authErrorStatus =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : null;

      if (authErrorStatus === 429) {
        setMagicLinkCooldownUntil(Date.now() + 60_000);
        setFeedback(
          "Supabase bloqueó temporalmente más envíos. Espera 60 segundos antes de reintentar.",
        );
      } else {
        setFeedback(error.message);
      }
    } else {
      setLastMagicLinkEmail(normalizedEmail);
      setMagicLinkCooldownUntil(Date.now() + 60_000);
      setFeedback(
        "Enviamos el enlace. Abre tu correo en este mismo dispositivo para completar el acceso.",
      );
    }

    setIsSubmitting(false);
  }

  function handleDevBypass() {
    const normalizedEmail = email.trim().toLowerCase();
    const safeEmail = isValidEmail(normalizedEmail)
      ? normalizedEmail
      : "dev@finflow.local";

    enableDevBypass(safeEmail);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FI</Text>
          </View>

          <Text style={styles.title}>FinFlow IQ</Text>
          <Text style={styles.subtitle}>Acceso con enlace mágico</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Sin contraseña. Te enviaremos un enlace a tu correo para iniciar
              sesión de forma segura.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={email}
            />
          </View>

          {!isSupabaseConfigured ? (
            <Text style={styles.errorText}>
              Falta configurar `EXPO_PUBLIC_SUPABASE_URL` y
              `EXPO_PUBLIC_SUPABASE_ANON_KEY` en tu entorno.
            </Text>
          ) : null}

          {feedback ? <Text style={styles.helperText}>{feedback}</Text> : null}
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          {lastMagicLinkEmail ? (
            <Text style={styles.lastEmailText}>
              Último enlace enviado a {lastMagicLinkEmail}
            </Text>
          ) : null}
          {remainingSeconds > 0 ? (
            <Text style={styles.cooldownText}>
              Reenvío disponible en {remainingSeconds}s
            </Text>
          ) : null}

          <Pressable
            disabled={!canSubmit}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#F8FAFC" />
            ) : (
              <Text style={styles.buttonText}>
                {remainingSeconds > 0
                  ? `Espera ${remainingSeconds}s`
                  : "Enviar enlace de acceso"}
              </Text>
            )}
          </Pressable>

          {isDevBypassEnabled ? (
            <Pressable
              onPress={handleDevBypass}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                Entrar en modo desarrollo
              </Text>
            </Pressable>
          ) : null}
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
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    backgroundColor: "#11182D",
    borderRadius: 24,
    padding: 24,
    gap: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E2A4D",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#7C8CFF",
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
  },
  infoBox: {
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderRadius: 16,
    padding: 16,
  },
  infoText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#0B1222",
    color: "#F8FAFC",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  helperText: {
    color: "#BFDBFE",
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 20,
  },
  lastEmailText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  cooldownText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#4F6BFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.28)",
    backgroundColor: "#16203A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: "#C7D2FE",
    fontSize: 14,
    fontWeight: "700",
  },
});
