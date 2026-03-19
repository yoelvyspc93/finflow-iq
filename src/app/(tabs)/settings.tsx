import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { theme } from "@/utils/theme";

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  hint,
  onPress,
  showChevron = Boolean(onPress),
  title,
  value,
}: {
  hint?: string;
  onPress?: () => void;
  showChevron?: boolean;
  title: string;
  value?: string;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={styles.rowValueWrap}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {showChevron ? <Feather color="#7D89A8" name="chevron-right" size={16} /> : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const user = useAuthStore((state) => state.user);

  const email = user?.email ?? "usuario@finflow.app";
  const firstName = `${user?.user_metadata?.first_name ?? ""}`.trim();
  const lastName = `${user?.user_metadata?.last_name ?? ""}`.trim();
  const displayName =
    `${firstName} ${lastName}`.trim() || email.split("@")[0] || "Usuario";

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" });
    clearAuth();
    router.replace("/login");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        secondaryAction={{
          icon: "bell",
          onPress: () => router.push("/notifications"),
          showBadge: true,
        }}
        title="Ajustes"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
            <View style={styles.avatarBadge} />
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        <Section title="Ajustes">
          <Row
            hint="Crear, editar y administrar carteras"
            onPress={() => router.push("/settings/wallets")}
            title="Billeteras"
          />
          <Row
            hint="Sesión, verificación en dos pasos y protección de acceso"
            onPress={() => router.push("/settings/security")}
            title="Seguridad"
          />
          <Row
            hint="Gestion de categorias personales"
            onPress={() => router.push("/settings/categories")}
            title="Categorías"
          />
          <Row
            hint="Gestion de fuentes de ingreso personales"
            onPress={() => router.push("/settings/income-sources")}
            title="Fuentes de ingreso"
          />
        </Section>

        <Pressable
          onPress={() => {
            void handleSignOut();
          }}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  profileCard: { alignItems: "center", gap: 6, paddingTop: 4 },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundCard,
  },
  avatarText: { color: theme.colors.white, fontSize: 28, fontWeight: "900" },
  avatarBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.background,
    backgroundColor: theme.colors.primary,
  },
  profileName: { color: theme.colors.white, fontSize: 28, fontWeight: "900" },
  profileEmail: { color: theme.colors.grayLight, fontSize: 13 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: theme.colors.white, fontSize: 14, fontWeight: "800" },
  sectionBody: {
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  rowHint: { color: theme.colors.grayLight, fontSize: 11, lineHeight: 16 },
  rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { color: theme.colors.primary, fontSize: 12, fontWeight: "800" },
  signOutButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
  },
  signOutText: { color: theme.colors.white, fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.88 },
});
