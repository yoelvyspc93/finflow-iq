import { Stack } from "expo-router";

import { AppDataBootstrap } from "@/components/app/app-data-bootstrap";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { LedgerBootstrap } from "@/components/ledger/ledger-bootstrap";
import { SecurityBootstrap } from "@/components/security/security-bootstrap";

export default function RootLayout() {
  return (
    <>
      <AuthBootstrap />
      <SecurityBootstrap />
      <AppDataBootstrap />
      <LedgerBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
