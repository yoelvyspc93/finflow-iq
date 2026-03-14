import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { Redirect } from "expo-router";

import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export default function Index() {
  const isReady = useAuthStore((state) => state.isReady);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (!isReady || status === "idle" || status === "loading") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Restaurando sesión...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status !== "authenticated") {
    return <Redirect href="/login" />;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Sesión activa</Text>
          <Text style={styles.subtitle}>
            La Fase 2 está lista. El siguiente paso es construir el PIN local y
            el bloqueo de la app.
          </Text>

          <View style={styles.userBlock}>
            <Text style={styles.userLabel}>Usuario autenticado</Text>
            <Text style={styles.userValue}>{user?.email ?? "Sin email"}</Text>
          </View>

          <Pressable
            onPress={() => {
              void handleSignOut();
            }}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Cerrar sesión</Text>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    backgroundColor: "#11182D",
    padding: 24,
    gap: 20,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
  },
  userBlock: {
    borderRadius: 16,
    backgroundColor: "#0B1222",
    padding: 16,
    gap: 6,
  },
  userLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  userValue: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#24314E",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
});
