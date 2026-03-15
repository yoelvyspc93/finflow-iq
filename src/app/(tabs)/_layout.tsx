import { StyleSheet, Text, View } from "react-native";

import { Redirect, Tabs } from "expo-router";

import { AppLoadingScreen } from "@/components/app/app-loading-screen";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

function TabGlyph({
  focused,
  icon,
}: {
  focused: boolean;
  icon: string;
}) {
  return (
    <View style={styles.tabGlyphWrap}>
      <Text style={[styles.tabGlyph, focused && styles.tabGlyphActive]}>
        {icon}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const guard = useOnboardingGuard();

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
        tabBarActiveTintColor: "#4562FF",
        tabBarInactiveTintColor: "#8B97B2",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabItem,
        sceneStyle: styles.scene,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: "Inicio",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="⌂" />,
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          tabBarLabel: "Finanzas",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="⊕" />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          tabBarLabel: "Planificación",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="◫" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: "Ajustes",
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} icon="⚙" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: "#0A1020",
  },
  tabBar: {
    height: 84,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#0D1324",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.10)",
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
  tabGlyph: {
    color: "#8B97B2",
    fontSize: 18,
    fontWeight: "700",
  },
  tabGlyphActive: {
    color: "#4562FF",
  },
});
