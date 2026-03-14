import { StyleSheet, Text, View } from "react-native";

import { Redirect, Tabs } from "expo-router";

import { AppLoadingScreen } from "@/components/app/app-loading-screen";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

function TabGlyph({
  focused,
  label,
}: {
  focused: boolean;
  label: string;
}) {
  return (
    <View style={[styles.glyph, focused && styles.glyphActive]}>
      <Text style={[styles.glyphText, focused && styles.glyphTextActive]}>
        {label}
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
        tabBarActiveTintColor: "#F8FAFC",
        tabBarInactiveTintColor: "#7184A6",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabItem,
        sceneStyle: styles.scene,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: "Panel",
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused} label="PL" />
          ),
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          tabBarLabel: "Finanzas",
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused} label="FX" />
          ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          tabBarLabel: "Plan",
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused} label="GO" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: "Ajustes",
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused} label="ST" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: "#090D1A",
  },
  tabBar: {
    height: 86,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#0B1222",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.08)",
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabItem: {
    paddingVertical: 4,
  },
  glyph: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11182D",
  },
  glyphActive: {
    backgroundColor: "#D9F99D",
  },
  glyphText: {
    color: "#7184A6",
    fontSize: 11,
    fontWeight: "800",
  },
  glyphTextActive: {
    color: "#0B1222",
  },
});
