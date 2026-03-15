import { Pressable, StyleSheet, View } from "react-native";

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
      <View style={[styles.thumb, value && styles.thumbActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: 999,
    padding: 4,
    justifyContent: "flex-start",
    backgroundColor: "#2C3552",
    borderWidth: 1,
    borderColor: "rgba(120, 136, 177, 0.24)",
  },
  trackActive: {
    justifyContent: "flex-end",
    backgroundColor: "#4B69FF",
    borderColor: "rgba(100, 127, 255, 0.52)",
  },
  trackDisabled: {
    opacity: 0.56,
  },
  thumb: {
    width: 22,
    height: 22,
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
