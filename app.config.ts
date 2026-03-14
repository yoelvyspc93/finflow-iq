import "dotenv/config";

import type { ExpoConfig } from "expo/config";

const easProjectId =
  process.env.EAS_PROJECT_ID?.trim() ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  undefined;

const config: ExpoConfig = {
  name: "FinFlow IQ",
  slug: "finflow-iq",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/logo.png",
  scheme: "finflowiq",
  userInterfaceStyle: "automatic",
  runtimeVersion: {
    policy: "appVersion",
  },
  ios: {
    bundleIdentifier: "com.finflowiq.app",
    icon: "./assets/logo.png",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0C1020",
      foregroundImage: "./assets/logo.png",
      backgroundImage: "./assets/logo.png",
      monochromeImage: "./assets/logo.png",
    },
    package: "com.finflowiq.app",
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/logo.png",
    name: "FinFlow IQ",
    shortName: "FinFlow IQ",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0C1020",
        android: {
          image: "./assets/logo.png",
          imageWidth: 76,
        },
      },
    ],
    "expo-secure-store",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    baseUrl: "/finflow-iq",
  },
};

if (easProjectId) {
  config.extra = {
    ...config.extra,
    eas: {
      projectId: easProjectId,
    },
  };
  config.updates = {
    url: `https://u.expo.dev/${easProjectId}`,
  };
}

export default config;
