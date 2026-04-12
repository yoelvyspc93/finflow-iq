import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/utils/theme";
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
    return theme.colors.white;
  }

  return icon === "bell" ? theme.colors.grayLight : theme.colors.white;
}

function getActionLabel(icon: HeaderActionIcon) {
  if (icon === "bell") return "Abrir notificaciones";
  if (icon === "back") return "Volver";
  if (icon === "close") return "Cerrar";
  return "Agregar";
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
      accessibilityLabel={getActionLabel(action.icon)}
      accessibilityRole="button"
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
                  source={require("@/assets/logo.png")}
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
  },
  content: {
    height: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: theme.spacing.md,
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  brandBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.blueSoft,
  },
  brandImage: {
    width: 40,
    height: 40,
  },
  brandText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  titleText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(115, 133, 181, 0.14)",
  },
  actionButtonFilled: {
    backgroundColor: theme.colors.primary,
    borderColor: "rgba(112, 135, 255, 0.42)",
    elevation: 4,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 8px 22px rgba(75, 105, 255, 0.24)" }
      : {
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.22,
          shadowRadius: theme.radii.pill,
          shadowOffset: { width: 0, height: 8 },
        }),
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
    backgroundColor: theme.colors.primary,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 0px 12px rgba(75, 105, 255, 0.55)" }
      : {
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.55,
          shadowRadius: theme.radii.pill,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.grayDark,
  },
});
