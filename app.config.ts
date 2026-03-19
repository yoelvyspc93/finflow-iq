import "dotenv/config";

import type { ExpoConfig } from "expo/config";

const easProjectId =
  process.env.EAS_PROJECT_ID?.trim() ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  undefined;

const config: ExpoConfig = {
  name: "FinFlow IQ",
  slug: "finflow-iq-dmcp3hamwrbmrhyf9vz6n",
  version: "1.0.0",
  orientation: "portrait",
  backgroundColor: "#0F1223",
  icon: "./assets/logo.png",
  scheme: "finflowiq",
  userInterfaceStyle: "dark",
  runtimeVersion: {
    policy: "appVersion",
  },
  ios: {
    bundleIdentifier: "com.finflowiq.app",
    icon: "./assets/logo.png",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0F1223",
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
    display: "standalone",
    backgroundColor: "#0F1223",
    themeColor: "#0F1223",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0F1223",
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

    baseUrl: "/finflow-iq",
  },
  owner: "yoelvyspc93",
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

