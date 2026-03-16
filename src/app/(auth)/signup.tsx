import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { Link, Redirect, router } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { signUpWithPassword } from "@/lib/auth/session";
import { useAuthStore } from "@/stores/auth-store";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isReady = useAuthStore((state) => state.isReady);
  const pendingMfaFactorId = useAuthStore((state) => state.pendingMfaFactorId);
  const status = useAuthStore((state) => state.status);

  const canSubmit = useMemo(
    () =>
      isSupabaseConfigured &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      isValidEmail(email) &&
      password.length >= 8 &&
      password === confirmPassword &&
      !isSubmitting,
    [confirmPassword, email, firstName, isSubmitting, lastName, password],
  );

  if (isReady && status === "authenticated") {
    return <Redirect href={pendingMfaFactorId ? "/mfa" : "/"} />;
  }

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!firstName.trim() || !lastName.trim()) {
      setFeedback("Completa nombre y apellidos.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setFeedback("Escribe un correo valido.");
      return;
    }
    if (password.length < 8) {
      setFeedback("La contrasena debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFeedback("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const { error } = await signUpWithPassword({
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
    });

    if (error) {
      setFeedback(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Usa tu nombre real, correo y contrasena.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre</Text>
            <View style={styles.inputShell}>
              <TextInput
                onChangeText={setFirstName}
                placeholder="Tu nombre"
                placeholderTextColor="#65728E"
                style={styles.input}
                value={firstName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Apellidos</Text>
            <View style={styles.inputShell}>
              <TextInput
                onChangeText={setLastName}
                placeholder="Tus apellidos"
                placeholderTextColor="#65728E"
                style={styles.input}
                value={lastName}
              />
            </View>
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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contrasena</Text>
            <View style={styles.inputShell}>
              <Feather color="#95A1BD" name="lock" size={17} />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="Minimo 8 caracteres"
                placeholderTextColor="#65728E"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirmar contrasena</Text>
            <View style={styles.inputShell}>
              <Feather color="#95A1BD" name="lock" size={17} />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setConfirmPassword}
                placeholder="Repite la contrasena"
                placeholderTextColor="#65728E"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />
            </View>
          </View>

          {!isSupabaseConfigured ? (
            <Text style={styles.errorText}>
              Falta configurar `EXPO_PUBLIC_SUPABASE_URL` y
              `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
            </Text>
          ) : null}
          {feedback ? <Text style={styles.errorText}>{feedback}</Text> : null}

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
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </Pressable>

          <Link href="/login" style={styles.link}>
            Ya tengo cuenta
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1020" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 24 },
  card: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(72, 97, 173, 0.16)",
    backgroundColor: "rgba(21, 28, 47, 0.90)",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  title: { color: "#F8FAFC", fontSize: 24, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#7F8AA6", fontSize: 14, textAlign: "center", marginBottom: 4 },
  fieldGroup: { gap: 8 },
  label: { color: "#D7E0F3", fontSize: 14, fontWeight: "700" },
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
  input: { flex: 1, color: "#F8FAFC", fontSize: 16, paddingVertical: 13 },
  errorText: { color: "#F6A6A8", fontSize: 13, lineHeight: 20 },
  button: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#4A66FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.58 },
  buttonPressed: { opacity: 0.88 },
  buttonText: { color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  link: { color: "#CBD6F7", fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 6 },
});

