import { Pressable, StyleSheet, Text, View } from "react-native";

export type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  compact?: boolean;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  compact = false,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              compact && styles.segmentCompact,
              isActive && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                compact && styles.segmentTextCompact,
                isActive && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#151D31",
    padding: 6,
  },
  containerCompact: {
    backgroundColor: "transparent",
    padding: 0,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentCompact: {
    minHeight: 40,
    flex: 0,
    minWidth: 80,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#1A2236",
  },
  segmentActive: {
    backgroundColor: "#4562FF",
  },
  segmentText: {
    color: "#8390AD",
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextCompact: {
    fontSize: 13,
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
});
