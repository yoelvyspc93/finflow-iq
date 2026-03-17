import { StyleSheet, View } from "react-native";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppDataBootstrap } from "@/components/app/app-data-bootstrap";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { LedgerBootstrap } from "@/components/ledger/ledger-bootstrap";
import { SecurityBootstrap } from "@/components/security/security-bootstrap";
import { SessionTimeoutGuard } from "@/components/security/session-timeout-guard";
import { DecorativeBackground } from "@/components/ui/decorative-background";
import { useSecurityStore } from "@/stores/security-store";

export default function RootLayout() {
  const setLastActivityAt = useSecurityStore((state) => state.setLastActivityAt);

  return (
    <GestureHandlerRootView style={styles.root}>
      <BottomSheetModalProvider>
        <View
          onTouchStart={() => setLastActivityAt()}
          style={styles.contentRoot}
        >
          <AuthBootstrap />
          <SecurityBootstrap />
          <SessionTimeoutGuard />
          <AppDataBootstrap />
          <LedgerBootstrap />
          <DecorativeBackground />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </View>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F1223",
  },
  contentRoot: {
    flex: 1,
    width: "100%",
    backgroundColor: "#0F1223",
    overflow: "hidden",
  },
});
