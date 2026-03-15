import { Pressable, StyleSheet, Text, View } from "react-native";

export type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  compact?: boolean;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  value: T;
};

export function SegmentedControl<T extends string>({
  compact = false,
  onChange,
  options,
  value,
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
    borderRadius: 14,
    backgroundColor: "#151B2E",
    padding: 4,
  },
  containerCompact: {
    backgroundColor: "transparent",
    padding: 0,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentCompact: {
    minHeight: 38,
    flex: 0,
    minWidth: 78,
    borderWidth: 1,
    borderColor: "rgba(92, 108, 149, 0.24)",
    backgroundColor: "#192035",
  },
  segmentActive: {
    backgroundColor: "#4664FF",
    shadowColor: "#4664FF",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  segmentText: {
    color: "#8D98B5",
    fontSize: 13,
    fontWeight: "700",
  },
  segmentTextCompact: {
    fontSize: 13,
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
});
