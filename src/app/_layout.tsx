import { Stack } from "expo-router";

import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { SecurityBootstrap } from "@/components/security/security-bootstrap";

export default function RootLayout() {
  return (
    <>
      <AuthBootstrap />
      <SecurityBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
