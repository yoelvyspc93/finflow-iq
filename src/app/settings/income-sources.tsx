import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { useRouter } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { listIncomeSources } from "@/modules/income-sources/service";
import type { IncomeSource } from "@/modules/income-sources/types";
import { useAuthStore } from "@/stores/auth-store";
import { theme } from "@/utils/theme";

export default function IncomeSourceSettingsScreen() {
  const router = useRouter();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void listIncomeSources({ isDevBypass, userId: user.id }).then(setIncomeSources);
  }, [isDevBypass, user?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        title="Fuentes de ingreso"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {incomeSources.map((source) => (
            <View key={source.id} style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.name}>{source.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg, gap: theme.spacing.lg },
  section: {
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: theme.colors.grayLight },
  name: { color: theme.colors.white, fontSize: 14, fontWeight: "700" },
});
