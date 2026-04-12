import { theme } from "@/utils/theme";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  value: T;
};

const MIN_SEGMENT_WIDTH = 78;
const SEGMENT_GAP = 8;

export function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  const didSetInitialIndicator = useRef(false);
  const [segmentLayouts, setSegmentLayouts] = useState<
    Record<string, { width: number; x: number }>
  >({});

  const translateX = useSharedValue(0);
  const pillWidth = useSharedValue(MIN_SEGMENT_WIDTH);

  const optionsKey = useMemo(
    () => options.map((option) => option.value).join("|"),
    [options],
  );
  const activeIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: pillWidth.value,
  }));

  const syncIndicator = useCallback(
    (animate: boolean) => {
      if (activeIndex < 0) {
        return;
      }

      const activeOption = options[activeIndex];
      if (!activeOption) {
        return;
      }

      const layout = segmentLayouts[activeOption.value];
      const springConfig = { damping: 22, mass: 0.8, stiffness: 280 };

      if (!layout) {
        const fallbackX = activeIndex * (MIN_SEGMENT_WIDTH + SEGMENT_GAP);
        if (animate) {
          translateX.value = withSpring(fallbackX, springConfig);
          pillWidth.value = withSpring(MIN_SEGMENT_WIDTH, springConfig);
        } else {
          translateX.value = fallbackX;
          pillWidth.value = MIN_SEGMENT_WIDTH;
        }
        return;
      }

      const nextWidth = Math.max(layout.width, MIN_SEGMENT_WIDTH);
      // Center the active pill when text width is below the minimum width.
      const nextX = layout.x - (nextWidth - layout.width) / 2;

      if (animate) {
        translateX.value = withSpring(nextX, springConfig);
        pillWidth.value = withSpring(nextWidth, springConfig);
      } else {
        translateX.value = nextX;
        pillWidth.value = nextWidth;
      }
    },
    [activeIndex, options, pillWidth, segmentLayouts, translateX],
  );

  useEffect(() => {
    setSegmentLayouts((current) => {
      const next: Record<string, { width: number; x: number }> = {};
      let changed = false;

      for (const option of options) {
        const previous = current[option.value];
        if (previous) {
          next[option.value] = previous;
        } else {
          changed = true;
        }
      }

      if (!changed && Object.keys(current).length !== Object.keys(next).length) {
        changed = true;
      }

      return changed ? next : current;
    });
  }, [options, optionsKey]);

  useEffect(() => {
    const hasLayout = options.some((option) => Boolean(segmentLayouts[option.value]));
    const animate = didSetInitialIndicator.current;
    syncIndicator(animate);

    if (!didSetInitialIndicator.current && hasLayout) {
      didSetInitialIndicator.current = true;
    }
  }, [options, segmentLayouts, syncIndicator, value]);

  return (
    <View style={styles.container}>
      <View style={styles.scrollContent}>
        <Animated.View style={[styles.activePill, styles.noPointerEvents, animatedPillStyle]} />
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <Pressable
              accessibilityRole="button"
              key={option.value}
              onLayout={(event) => {
                const { width, x } = event.nativeEvent.layout;
                setSegmentLayouts((current) => {
                  const previous = current[option.value];
                  if (
                    previous &&
                    Math.abs(previous.width - width) < 0.5 &&
                    Math.abs(previous.x - x) < 0.5
                  ) {
                    return current;
                  }

                  return {
                    ...current,
                    [option.value]: { width, x },
                  };
                });
              }}
              onPress={() => onChange(option.value)}
              style={[styles.segment, styles.segmentFill]}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.xs,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SEGMENT_GAP,
    position: "relative",
  },
  segment: {
    zIndex: 1,
    position: "relative",
    flex: 0,
    minHeight: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentFill: {
    flex: 1,
    minWidth: MIN_SEGMENT_WIDTH,
  },
  activePill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 4px 12px rgba(75, 105, 255, 0.24)" }
      : {
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.24,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }),
  },
  noPointerEvents: {
    pointerEvents: "none",
  },
  segmentText: {
    color: theme.colors.grayLight,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: theme.colors.white,
  },
});
