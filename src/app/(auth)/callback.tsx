import { StyleSheet, Text, View } from "react-native";

import { Link, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { useAuthStore } from "@/stores/auth-store";

export default function CallbackScreen() {
  const isReady = useAuthStore((state) => state.isReady);
  const status = useAuthStore((state) => state.status);

  if (isReady && status === "authenticated") {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <Text style={styles.title}>Redireccion no soportada</Text>
        <Text style={styles.subtitle}>
          Este proyecto ya no usa enlaces magicos. Entra con email y contrasena.
        </Text>

        <Link href="/login" style={styles.link}>
          Volver al login
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F1223",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  link: {
    color: "#7C8CFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
