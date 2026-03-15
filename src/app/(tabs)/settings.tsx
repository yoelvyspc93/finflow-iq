import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useSecurityStore } from "@/stores/security-store";

function SectionRow({
  hint,
  onPress,
  value,
  title,
}: {
  hint?: string;
  onPress?: () => void;
  title: string;
  value?: string;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionRow,
        pressed && onPress && styles.sectionRowPressed,
      ]}
    >
      <View style={styles.sectionRowText}>
        <Text style={styles.sectionRowTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionRowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.sectionRowValue}>{value ?? "›"}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const wallets = useAppStore((state) => state.wallets);
  const pinStatus = useSecurityStore((state) => state.pinStatus);

  const email = user?.email ?? "usuario@finflow.app";
  const displayName = email.split("@")[0] || "Usuario";

  async function handleSignOut() {
    if (isDevBypass) {
      clearAuth();
      return;
    }

    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.border} />
      <ScreenHeader title="Ajustes" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
            <View style={styles.avatarBadge} />
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Carteras</Text>
            <Text style={styles.sectionAction}>+ Añadir</Text>
          </View>
          {wallets.map((wallet) => (
            <View key={wallet.id} style={styles.walletRow}>
              <View style={styles.walletGlyph}>
                <Text style={styles.walletGlyphText}>□</Text>
              </View>
              <View style={styles.walletText}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                <Text style={styles.walletMeta}>
                  {wallet.currency} • {wallet.balance.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.walletActions}>✎   ⌫</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finanzas personales</Text>
          <SectionRow
            hint="Porcentaje del ingreso total"
            title="Meta de ahorro mensual"
            value={`${settings?.savingsGoalPercent ?? "--"}%`}
          />
          <SectionRow
            hint="Día del mes para el reinicio del ciclo"
            title="Inicio del mes financiero"
            value="1st"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          <SectionRow
            title="Selector de moneda"
            value={`${settings?.primaryCurrency ?? "USD"} ($)`}
          />
          <SectionRow
            title="Formato de fecha"
            value={settings?.dateFormat ?? "DD/MM/YYYY"}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración de IA</Text>
          <SectionRow title="Analysis Frequency" value="Daily" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <SectionRow
            title="Enable PIN"
            value={pinStatus === "not_setup" ? "Off" : "On"}
          />
          <SectionRow title="Change PIN" value="◌" />
          <SectionRow title="Lock Time" value="Immediate" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestión de datos</Text>
          <SectionRow
            hint="Editar categorías de gastos"
            title="Gestión de categorías"
          />
          <SectionRow
            hint="Gestiona tu salario y trabajos secundarios"
            title="Fuentes de ingresos"
          />
        </View>

        <Pressable
          onPress={() => {
            void handleSignOut();
          }}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
          ]}
        >
          <Text style={styles.signOutButtonText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1020",
  },
  border: {
    position: "absolute",
    top: 61,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.09)",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 18,
  },
  profileCard: {
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: "#4562FF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18213A",
  },
  avatarText: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "900",
  },
  avatarBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#0A1020",
    backgroundColor: "#4562FF",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  profileEmail: {
    color: "#8D98B2",
    fontSize: 14,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  sectionAction: {
    color: "#4562FF",
    fontSize: 13,
    fontWeight: "700",
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "#141D32",
    padding: 14,
  },
  walletGlyph: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(69, 98, 255, 0.14)",
  },
  walletGlyphText: {
    color: "#4562FF",
    fontSize: 14,
    fontWeight: "800",
  },
  walletText: {
    flex: 1,
    gap: 4,
  },
  walletName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  walletMeta: {
    color: "#8D98B2",
    fontSize: 12,
  },
  walletActions: {
    color: "#A9B4CC",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    backgroundColor: "#141D32",
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  sectionRowPressed: {
    opacity: 0.88,
  },
  sectionRowText: {
    flex: 1,
    gap: 3,
  },
  sectionRowTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionRowHint: {
    color: "#8D98B2",
    fontSize: 11,
    lineHeight: 16,
  },
  sectionRowValue: {
    color: "#4562FF",
    fontSize: 13,
    fontWeight: "800",
  },
  signOutButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2236",
    marginTop: 4,
  },
  signOutButtonPressed: {
    opacity: 0.88,
  },
  signOutButtonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
});
