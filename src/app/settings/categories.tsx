import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { useRouter } from "expo-router";

import { DecorativeBackground } from "@/components/ui/decorative-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { listCategories } from "@/modules/categories/service";
import type { Category } from "@/modules/categories/types";
import { useAuthStore } from "@/stores/auth-store";

export default function CategorySettingsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  const isDevBypass = useAuthStore((state) => state.isDevBypass);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void listCategories({ isDevBypass, userId: user.id }).then(setCategories);
  }, [isDevBypass, user?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <ScreenHeader
        leftAction={{ icon: "back", onPress: () => router.back() }}
        title="Categorias"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {categories.map((category) => (
            <View key={category.id} style={styles.row}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: category.color ? category.color : "#4F6BFF" },
                ]}
              />
              <Text style={styles.name}>{category.name}</Text>
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
  dot: { width: 10, height: 10, borderRadius: 999 },
  name: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
});
