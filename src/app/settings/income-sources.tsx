import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { useRouter } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { listIncomeSources } from "@/modules/income-sources/service";
import type { IncomeSource } from "@/modules/income-sources/types";
import { useAuthStore } from "@/stores/auth-store";

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
  safeArea: { flex: 1, backgroundColor: "#0B1020" },
  content: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 104, gap: 16 },
  section: {
    borderRadius: 14,
    backgroundColor: "rgba(21, 28, 47, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(88, 104, 149, 0.14)",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(88, 104, 149, 0.12)",
  },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#94A3B8" },
  name: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
});
