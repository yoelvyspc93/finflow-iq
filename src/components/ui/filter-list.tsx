import { theme } from "@/utils/theme";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { SegmentedOption } from "./segmented-control";

type FilterListProps<T extends string> = {
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  value: T;
};

export function FilterList<T extends string>({
  onChange,
  options,
  value,
}: FilterListProps<T>) {
  return (
    <ScrollView
      bounces={false}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text
              numberOfLines={1}
              style={[styles.segmentText, isActive && styles.segmentTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.rightSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    padding: 0,
  },
  segment: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  segmentText: {
    color: theme.colors.grayLight,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: theme.colors.white,
  },
  rightSpacer: {
    width: 2,
  },
});
