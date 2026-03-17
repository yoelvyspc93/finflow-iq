import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppSwitch } from "@/components/ui/app-switch";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  createTotpChallenge,
  disableTotpFactor,
  enrollTotpFactor,
  getPrimaryTotpFactor,
  toUserFriendlyMfaError,
  verifyTotpChallenge,
} from "@/lib/auth/mfa";
import { updateSettings } from "@/modules/settings/service";
import type { SessionTimeoutMinutes } from "@/modules/settings/types";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useSecurityStore } from "@/stores/security-store";
import { theme } from "@/utils/theme";

type MfaSheetMode = "enable" | "disable" | null;

const timeoutOptions: { label: string; value: SessionTimeoutMinutes }[] = [
  { label: "Inmediato", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
];

function Row({
  hint,
  onPress,
  title,
  value,
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
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={styles.rowValueWrap}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const [mfaSheet, setMfaSheet] = useState<MfaSheetMode>(null);
  const [timeoutSheetOpen, setTimeoutSheetOpen] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFriendlyName] = useState("FinFlow Authenticator");
  const [isMfaSubmitting, setIsMfaSubmitting] = useState(false);
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    secret: string;
    uri: string;
  } | null>(null);

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const replaceLocalSettings = useAppStore((state) => state.replaceLocalSettings);
  const mfaEnabled = useSecurityStore((state) => state.mfaEnabled);
  const mfaFactorId = useSecurityStore((state) => state.mfaFactorId);
  const setMfa = useSecurityStore((state) => state.setMfa);

  const timeoutLabel = useMemo(() => {
    const current = settings?.sessionTimeoutMinutes ?? 5;
    return timeoutOptions.find((item) => item.value === current)?.label ?? "5 min";
  }, [settings?.sessionTimeoutMinutes]);

  useEffect(() => {
    if (!user?.id || isDevBypass) {
      return;
    }

    void getPrimaryTotpFactor()
      .then((factor) => {
        setMfa({
          factorId: factor?.id ?? null,
          isEnabled: Boolean(factor),
        });
      })
      .catch(() => {
        setMfa({
          factorId: null,
          isEnabled: false,
        });
      });
  }, [isDevBypass, setMfa, user?.id]);

  function closeMfaSheet() {
    setMfaSheet(null);
    setMfaError(null);
    setMfaCode("");
    setIsMfaSubmitting(false);
    setEnrollment(null);
  }

  async function handleOpenMfaEnable() {
    if (isDevBypass) {
      setMfaError("MFA no aplica en modo desarrollo.");
      return;
    }

    setMfaError(null);
    setIsMfaSubmitting(true);

    try {
      const data = await enrollTotpFactor(mfaFriendlyName);
      setEnrollment({
        factorId: data.id,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setMfaSheet("enable");
    } catch (error) {
      setMfaError(toUserFriendlyMfaError(error, "No se pudo iniciar el setup MFA."));
    } finally {
      setIsMfaSubmitting(false);
    }
  }

  async function handleVerifyMfaEnable() {
    if (!enrollment) {
      setMfaError("No hay un factor MFA pendiente.");
      return;
    }
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      setMfaError("Escribe un codigo de 6 digitos.");
      return;
    }

    setIsMfaSubmitting(true);
    setMfaError(null);

    try {
      const challenge = await createTotpChallenge(enrollment.factorId);
      await verifyTotpChallenge({
        challengeId: challenge.id,
        code: mfaCode,
        factorId: enrollment.factorId,
      });

      setMfa({
        factorId: enrollment.factorId,
        isEnabled: true,
      });
      closeMfaSheet();
    } catch (error) {
      setMfaError(toUserFriendlyMfaError(error, "Codigo MFA invalido o vencido."));
      setIsMfaSubmitting(false);
    }
  }

  async function handleDisableMfa() {
    if (!mfaFactorId) {
      setMfaError("No hay un factor MFA activo.");
      return;
    }
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      setMfaError("Escribe un codigo de 6 digitos.");
      return;
    }

    setIsMfaSubmitting(true);
    setMfaError(null);

    try {
      await disableTotpFactor({
        code: mfaCode,
        factorId: mfaFactorId,
      });

      setMfa({
        factorId: null,
        isEnabled: false,
      });
      closeMfaSheet();
    } catch (error) {
      setMfaError(toUserFriendlyMfaError(error, "No se pudo desactivar MFA."));
      setIsMfaSubmitting(false);
    }
  }

  function handleToggleMfa(nextValue: boolean) {
    if (nextValue) {
      void handleOpenMfaEnable();
      return;
    }

    setMfaCode("");
    setMfaError(null);
    setMfaSheet("disable");
  }

  async function handleSelectTimeout(value: SessionTimeoutMinutes) {
    if (!settings || !user?.id) {
      return;
    }

    if (settings.sessionTimeoutMinutes === value) {
      setTimeoutSheetOpen(false);
      return;
    }

    if (isDevBypass) {
      replaceLocalSettings({
        ...settings,
        sessionTimeoutMinutes: value,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const nextSettings = await updateSettings({
        patch: { session_timeout_minutes: value },
        userId: user.id,
      });
      replaceLocalSettings(nextSettings);
    }
    setTimeoutSheetOpen(false);
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        title="Seguridad"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.securityRow}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>MFA (Authenticator)</Text>
              <Text style={styles.rowHint}>
                Toggle unico para activar/desactivar MFA TOTP.
              </Text>
            </View>
            <AppSwitch
              disabled={isMfaSubmitting || isDevBypass}
              onValueChange={handleToggleMfa}
              value={mfaEnabled}
            />
          </View>
          <Row
            hint="Cierra sesion automaticamente cuando no uses la app."
            onPress={() => setTimeoutSheetOpen(true)}
            title="Tiempo por inactividad"
            value={timeoutLabel}
          />
        </View>
        {mfaError ? <Text style={styles.inlineError}>{mfaError}</Text> : null}
      </ScrollView>

      <BottomSheet onClose={closeMfaSheet} visible={mfaSheet === "enable"}>
        <Text style={styles.sheetTitle}>Activar MFA TOTP</Text>
        <Text style={styles.sheetDescription}>1) Agrega este secreto en tu autenticador.</Text>
        <Text style={styles.mfaSecret}>{enrollment?.secret ?? "--"}</Text>
        <Text style={styles.sheetDescription}>2) Usa este codigo URI si tu app lo soporta.</Text>
        <Text style={styles.mfaUri}>{enrollment?.uri ?? "--"}</Text>
        <Text style={styles.sheetDescription}>
          3) Ingresa un codigo de 6 digitos para verificar.
        </Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setMfaCode}
          placeholder="123456"
          placeholderTextColor={theme.colors.grayLight}
          style={styles.mfaCodeInput}
          value={mfaCode}
        />
        {mfaError ? <Text style={styles.error}>{mfaError}</Text> : null}
        <Pressable
          onPress={() => {
            void handleVerifyMfaEnable();
          }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            isMfaSubmitting && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {isMfaSubmitting ? "Verificando..." : "Verificar y activar"}
          </Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet onClose={closeMfaSheet} visible={mfaSheet === "disable"}>
        <Text style={styles.sheetTitle}>Desactivar MFA</Text>
        <Text style={styles.sheetDescription}>
          Confirma con un codigo actual de tu autenticador.
        </Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setMfaCode}
          placeholder="123456"
          placeholderTextColor={theme.colors.grayLight}
          style={styles.mfaCodeInput}
          value={mfaCode}
        />
        {mfaError ? <Text style={styles.error}>{mfaError}</Text> : null}
        <Pressable
          onPress={() => {
            void handleDisableMfa();
          }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            isMfaSubmitting && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {isMfaSubmitting ? "Desactivando..." : "Confirmar y desactivar"}
          </Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet onClose={() => setTimeoutSheetOpen(false)} visible={timeoutSheetOpen}>
        <Text style={styles.sheetTitle}>Tiempo por inactividad</Text>
        <Text style={styles.sheetDescription}>
          Selecciona cuando cerrar sesion automaticamente.
        </Text>
        <View style={styles.timeoutList}>
          {timeoutOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                void handleSelectTimeout(option.value);
              }}
              style={({ pressed }) => [
                styles.timeoutItem,
                settings?.sessionTimeoutMinutes === option.value && styles.timeoutItemActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.timeoutText,
                  settings?.sessionTimeoutMinutes === option.value && styles.timeoutTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
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
  section: {
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  rowText: { flex: 1, gap: 2, maxWidth: "70%" },
  rowTitle: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  rowHint: { color: theme.colors.grayLight, fontSize: 11, lineHeight: 16 },
  rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { color: theme.colors.primary, fontSize: 12, fontWeight: "700" },
  inlineError: {
    color: theme.colors.red,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  sheetTitle: {
    color: theme.colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  sheetDescription: {
    color: theme.colors.grayLight,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  mfaSecret: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  mfaUri: {
    color: theme.colors.grayLight,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  mfaCodeInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
    paddingVertical: 10,
    marginBottom: 8,
  },
  error: { color: theme.colors.red, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  button: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
  timeoutList: {
    gap: 8,
    marginTop: 8,
  },
  timeoutItem: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  timeoutItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.blueSoft,
  },
  timeoutText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  timeoutTextActive: {
    color: theme.colors.white,
    fontWeight: "700",
  },
  pressed: { opacity: 0.88 },
});
