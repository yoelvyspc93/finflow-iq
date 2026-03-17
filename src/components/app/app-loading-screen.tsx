import { StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { DecorativeBackground } from "@/components/ui/decorative-background";

type AppLoadingScreenProps = {
  message: string;
};

export function AppLoadingScreen({ message }: AppLoadingScreenProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <DecorativeBackground />
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Image
              contentFit="contain"
              source={require("../../../assets/logo.png")}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.title}>FinFlow IQ</Text>
          <Text style={styles.subtitle}>
            Informacion inteligente para tu trayectoria financiera
          </Text>
        </View>

        <View style={styles.statusWrap}>
          <Text style={styles.message}>{message || "Conectando..."}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B1020",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 42,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  logoBadge: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: "rgba(31, 53, 130, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 280,
    color: "#7F8DAA",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  statusWrap: {
    alignItems: "center",
  },
  message: {
    color: "#7987A5",
    fontSize: 15,
    fontWeight: "600",
  },
});
