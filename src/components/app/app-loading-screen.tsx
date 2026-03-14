import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";

type AppLoadingScreenProps = {
  message: string;
};

export function AppLoadingScreen({ message }: AppLoadingScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator color="#9FB0FF" size="large" />
          <Text style={styles.title}>FinFlow IQ</Text>
          <Text style={styles.message}>{message}</Text>
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    backgroundColor: "#11182D",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "800",
  },
  message: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
