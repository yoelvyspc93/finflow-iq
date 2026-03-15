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

import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
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
  const isSecurityLoaded = useSecurityStore((state) => state.isLoaded);
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

  if (isReady && status === "authenticated" && !isSecurityLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DecorativeBackground />
        <View style={styles.loadingState}>
          <ActivityIndicator color="#F8FAFC" />
        </View>
      </SafeAreaView>
    );
  }

  if (isReady && status === "authenticated" && isSecurityLoaded) {
    return <Redirect href={pinStatus === "locked" ? "/pin" : "/"} />;
  }

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setFeedback("Escribe un correo valido.");
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
          "Supabase bloqueo temporalmente mas envios. Espera 60 segundos antes de reintentar.",
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
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
              <Image
                contentFit="contain"
                source={require("../../../assets/logo.png")}
                style={styles.badgeImage}
              />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              FinFlow <Text style={styles.titleAccent}>IQ</Text>
            </Text>
            <Text style={styles.subtitle}>Bienvenido de nuevo</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons color="#5270FF" name="sparkles-outline" size={15} />
            <Text style={styles.infoText}>
              Sin contrasena, recibiras un enlace magico en tu email para acceder
              de forma segura.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electronico</Text>
            <View style={styles.inputShell}>
              <Feather color="#95A1BD" name="mail" size={17} />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor="#65728E"
                style={styles.input}
                value={email}
              />
            </View>
          </View>

          {!isSupabaseConfigured ? (
            <Text style={styles.errorText}>
              Falta configurar `EXPO_PUBLIC_SUPABASE_URL` y
              `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
            </Text>
          ) : null}

          {feedback ? <Text style={styles.helperText}>{feedback}</Text> : null}
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          {lastMagicLinkEmail ? (
            <Text style={styles.metaText}>
              Ultimo enlace enviado a {lastMagicLinkEmail}
            </Text>
          ) : null}
          {remainingSeconds > 0 ? (
            <Text style={styles.metaText}>
              Reenvio disponible en {remainingSeconds}s
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
            {!isSubmitting && remainingSeconds <= 0 ? (
              <Feather color="#F8FAFC" name="arrow-right" size={16} />
            ) : null}
          </Pressable>

          {__DEV__ ? (
            <Pressable
              onPress={handleDevBypass}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Entrar en modo desarrollo</Text>
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
    backgroundColor: "#0B1020",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 344,
    alignSelf: "center",
    gap: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(72, 97, 173, 0.16)",
    backgroundColor: "rgba(21, 28, 47, 0.90)",
    paddingHorizontal: 14,
    paddingVertical: 16,
    shadowColor: "#020617",
    shadowOpacity: 0.34,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(43, 61, 136, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  badgeImage: {
    width: 21,
    height: 21,
  },
  header: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  titleAccent: {
    color: "#4B69FF",
  },
  subtitle: {
    color: "#7F8AA6",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(65, 88, 172, 0.48)",
    backgroundColor: "rgba(40, 53, 108, 0.20)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoText: {
    flex: 1,
    color: "#B9C4DD",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 10,
  },
  label: {
    color: "#D7E0F3",
    fontSize: 14,
    fontWeight: "700",
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(115, 128, 167, 0.18)",
    backgroundColor: "rgba(17, 22, 39, 0.92)",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 16,
    paddingVertical: 13,
  },
  helperText: {
    color: "#BFD4FF",
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: "#F6A6A8",
    fontSize: 13,
    lineHeight: 20,
  },
  metaText: {
    color: "#8694B2",
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#4A66FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    shadowColor: "#4A66FF",
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(74, 102, 255, 0.26)",
    backgroundColor: "rgba(18, 24, 42, 0.90)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#CBD6F7",
    fontSize: 13,
    fontWeight: "700",
  },
});
