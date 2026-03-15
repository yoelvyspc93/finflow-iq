import { Pressable, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";

type ScreenHeaderProps = {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  showBrand?: boolean;
  title: string;
};

function ActionButton({
  isPrimary = false,
  label,
  onPress,
}: {
  isPrimary?: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isPrimary && styles.primaryActionButton,
        !onPress && styles.actionButtonDisabled,
        pressed && onPress && styles.actionButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          isPrimary && styles.primaryActionButtonText,
        ]}
      >
        {label}
      </Text>
      {label === "◔" ? <View style={styles.notificationDot} /> : null}
    </Pressable>
  );
}

export function ScreenHeader({
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel = "+",
  secondaryActionLabel = "◔",
  showBrand = false,
  title,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {showBrand ? (
          <>
            <View style={styles.brandBadge}>
              <Image
                contentFit="contain"
                source={require("../../../assets/logo.png")}
                style={styles.brandImage}
              />
            </View>
            <Text style={styles.brandText}>FinFlow IQ</Text>
          </>
        ) : (
          <Text style={styles.titleText}>{title}</Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <ActionButton
          isPrimary
          label={primaryActionLabel}
          onPress={onPrimaryAction}
        />
        <ActionButton
          label={secondaryActionLabel}
          onPress={onSecondaryAction}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(69, 98, 255, 0.18)",
  },
  brandImage: {
    width: 18,
    height: 18,
  },
  brandText: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
  },
  titleText: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  primaryActionButton: {
    backgroundColor: "#4562FF",
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonText: {
    color: "#C3CEE5",
    fontSize: 18,
    fontWeight: "800",
  },
  primaryActionButtonText: {
    color: "#FFFFFF",
  },
  notificationDot: {
    position: "absolute",
    right: 8,
    top: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4562FF",
  },
});
