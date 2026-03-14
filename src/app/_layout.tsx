import { Stack } from "expo-router";

import { AuthBootstrap } from "@/components/auth/auth-bootstrap";

export default function RootLayout() {
  return (
    <>
      <AuthBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
