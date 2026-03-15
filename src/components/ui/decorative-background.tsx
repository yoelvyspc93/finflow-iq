import { StyleSheet, View } from "react-native";

export function DecorativeBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.base} />
      <View style={styles.waveOne} />
      <View style={styles.waveTwo} />
      <View style={styles.waveThree} />
      <View style={styles.glow} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A1020",
  },
  waveOne: {
    position: "absolute",
    right: -180,
    top: 160,
    width: 420,
    height: 420,
    borderRadius: 420,
    borderWidth: 26,
    borderColor: "rgba(69, 98, 255, 0.08)",
    transform: [{ scaleX: 1.35 }, { rotate: "-18deg" }],
  },
  waveTwo: {
    position: "absolute",
    right: -120,
    top: 260,
    width: 340,
    height: 340,
    borderRadius: 340,
    borderWidth: 18,
    borderColor: "rgba(85, 112, 255, 0.06)",
    transform: [{ scaleX: 1.55 }, { rotate: "-14deg" }],
  },
  waveThree: {
    position: "absolute",
    left: -260,
    bottom: -120,
    width: 540,
    height: 540,
    borderRadius: 540,
    borderWidth: 24,
    borderColor: "rgba(38, 63, 170, 0.08)",
    transform: [{ scaleX: 1.2 }, { rotate: "22deg" }],
  },
  glow: {
    position: "absolute",
    top: -120,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(70, 102, 255, 0.08)",
  },
});
