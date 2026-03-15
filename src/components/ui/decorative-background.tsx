import { StyleSheet, View } from "react-native";

import { Image } from "expo-image";

export function DecorativeBackground() {
  return (
    <View pointerEvents="none" style={styles.root}>
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
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
});
