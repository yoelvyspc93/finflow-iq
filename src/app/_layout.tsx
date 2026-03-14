import { Stack } from "expo-router";

import { AppDataBootstrap } from "@/components/app/app-data-bootstrap";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { SecurityBootstrap } from "@/components/security/security-bootstrap";

export default function RootLayout() {
  return (
    <>
      <AuthBootstrap />
      <SecurityBootstrap />
      <AppDataBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
