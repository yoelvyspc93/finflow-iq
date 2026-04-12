import { StyleSheet, View } from "react-native";

import { Image } from "expo-image";

export function DecorativeBackground() {
  return (
    <View style={styles.root}>
      <Image
        contentFit="cover"
        source={require("@/assets/texture.png")}
        style={styles.texture}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "#0F1223",
    pointerEvents: "none",
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
});
