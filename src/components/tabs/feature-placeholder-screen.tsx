import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { DecorativeBackground } from "@/components/ui/decorative-background";

type FeaturePlaceholderScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
};

export function FeaturePlaceholderScreen({
  description,
  eyebrow,
  points,
  title,
}: FeaturePlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Lo siguiente en esta seccion</Text>
          {points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <View style={styles.pointDot} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
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
    gap: 16,
    padding: 24,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: "#121B31",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.18)",
    gap: 10,
    padding: 22,
  },
  eyebrow: {
    color: "#A5B4FC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
  },
  description: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
  },
  listCard: {
    borderRadius: 22,
    backgroundColor: "#0D1427",
    gap: 14,
    padding: 20,
  },
  listTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "800",
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pointDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#4F6BFF",
    marginTop: 6,
  },
  pointText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 21,
  },
});
