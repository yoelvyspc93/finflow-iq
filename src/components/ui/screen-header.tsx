import { Pressable, StyleSheet, Text, View } from "react-native";

import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

type HeaderActionIcon = "back" | "bell" | "close" | "plus";

type HeaderAction = {
  icon: HeaderActionIcon;
  onPress?: () => void;
  showBadge?: boolean;
};

type ScreenHeaderProps = {
  leftAction?: HeaderAction;
  primaryAction?: HeaderAction;
  secondaryAction?: HeaderAction;
  showBrand?: boolean;
  title: string;
};

function resolveIconColor(icon: HeaderActionIcon, filled: boolean) {
  if (filled) {
    return "#FFFFFF";
  }

  return icon === "bell" ? "#C8D3F0" : "#F8FAFC";
}

function HeaderIcon({
  color,
  icon,
}: {
  color: string;
  icon: HeaderActionIcon;
}) {
  if (icon === "bell") {
    return <Ionicons color={color} name="notifications-outline" size={18} />;
  }

  if (icon === "back") {
    return <Feather color={color} name="arrow-left" size={18} />;
  }

  if (icon === "close") {
    return <Feather color={color} name="x" size={18} />;
  }

  return <Feather color={color} name="plus" size={18} />;
}

function ActionButton({
  action,
  filled = false,
}: {
  action: HeaderAction;
  filled?: boolean;
}) {
  const color = resolveIconColor(action.icon, filled);

  return (
    <Pressable
      disabled={!action.onPress}
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.actionButton,
        filled && styles.actionButtonFilled,
        !action.onPress && styles.actionButtonDisabled,
        pressed && action.onPress && styles.actionButtonPressed,
      ]}
    >
      <HeaderIcon color={color} icon={action.icon} />
      {action.showBadge ? <View style={styles.notificationDot} /> : null}
    </Pressable>
  );
}

export function ScreenHeader({
  leftAction,
  primaryAction,
  secondaryAction,
  showBrand = false,
  title,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leading}>
          {leftAction ? <ActionButton action={leftAction} /> : null}

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
          {primaryAction ? <ActionButton action={primaryAction} filled /> : null}
          {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  brandBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(58, 96, 255, 0.18)",
  },
  brandImage: {
    width: 15,
    height: 15,
  },
  brandText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  titleText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(115, 133, 181, 0.14)",
  },
  actionButtonFilled: {
    backgroundColor: "#4664FF",
    borderColor: "rgba(112, 135, 255, 0.42)",
    shadowColor: "#4664FF",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  actionButtonDisabled: {
    opacity: 0.72,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  notificationDot: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4E6CFF",
    shadowColor: "#4E6CFF",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(132, 147, 188, 0.12)",
  },
});
