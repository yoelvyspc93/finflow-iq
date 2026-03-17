import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

type AppSwitchProps = {
  disabled?: boolean;
  onValueChange?: (value: boolean) => void;
  value: boolean;
};

export function AppSwitch({
  disabled = false,
  onValueChange,
  value,
}: AppSwitchProps) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, value]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange?.(!value)}
      style={({ pressed }) => [
        styles.track,
        value && styles.trackActive,
        disabled && styles.trackDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          value && styles.thumbActive,
          { transform: [{ translateX }] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 999,
    padding: 3,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C3552",
    borderWidth: 1,
    borderColor: "rgba(120, 136, 177, 0.24)",
  },
  trackActive: {
    backgroundColor: "#4B69FF",
    borderColor: "rgba(100, 127, 255, 0.52)",
  },
  trackDisabled: {
    opacity: 0.56,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  thumbActive: {
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
  },
});
