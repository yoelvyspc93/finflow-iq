import { StyleSheet, View } from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLoadingScreen } from "@/components/app/app-loading-screen";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { theme } from "@/utils/theme";
function TabGlyph({
  focused,
  icon,
}: {
  focused: boolean;
  icon: "dashboard" | "finances" | "planning" | "settings";
}) {
  const color = focused ? theme.colors.primary : theme.colors.grayLight;

  return (
    <View style={styles.tabGlyphWrap}>
      {icon === "dashboard" ? (
        <Ionicons color={color} name={focused ? "home" : "home-outline"} size={20} />
      ) : null}
      {icon === "finances" ? (
        <MaterialCommunityIcons
          color={color}
          name={focused ? "plus-circle" : "plus-circle-outline"}
          size={20}
        />
      ) : null}
      {icon === "planning" ? (
        <Ionicons
          color={color}
          name={focused ? "calendar" : "calendar-outline"}
          size={20}
        />
      ) : null}
      {icon === "settings" ? (
        <Ionicons
          color={color}
          name={focused ? "settings" : "settings-outline"}
          size={20}
        />
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const guard = useOnboardingGuard();
  const insets = useSafeAreaInsets();

  if (guard.isLoading) {
    return <AppLoadingScreen message={guard.loadingMessage} />;
  }

  if (guard.redirectTo) {
    return <Redirect href={guard.redirectTo} />;
  }

  if (guard.requiresOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.grayLight,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 74 + insets.bottom,
            paddingBottom: Math.max(theme.spacing.xs, insets.bottom),
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: "Inicio",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="dashboard" />,
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          tabBarLabel: "Finanzas",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="finances" />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          tabBarLabel: "Planificación",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="planning" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: "Ajustes",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="settings" />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    maxHeight: 74,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    backgroundColor: 'red',
    borderTopWidth: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabGlyphWrap: {
    minWidth: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
