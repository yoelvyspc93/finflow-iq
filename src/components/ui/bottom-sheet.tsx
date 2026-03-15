import { useCallback, useEffect, useRef } from "react";
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

type BottomSheetProps = {
  children: React.ReactNode;
  onClose: () => void;
  visible: boolean;
};

export function BottomSheet({ children, onClose, visible }: BottomSheetProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (!visible) {
      if (isPresentedRef.current) {
        modalRef.current?.dismiss();
        isPresentedRef.current = false;
      }

      return undefined;
    }

    if (!isPresentedRef.current) {
      modalRef.current?.present();
      isPresentedRef.current = true;
    }

    return undefined;
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.72}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      animateOnMount
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableDismissOnClose
      enableDynamicSizing
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBehavior={Platform.OS === "ios" ? "interactive" : "extend"}
      maxDynamicContentSize={Math.min(height * 0.88, 720)}
      onDismiss={handleDismiss}
      style={[styles.sheet, Platform.OS === "web" && styles.webSheet]}
    >
      <BottomSheetScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    shadowColor: "#020617",
    shadowOpacity: 0.44,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: -12 },
    elevation: 16,
  },
  webSheet: {
    width: "100%",
    alignSelf: "center",
  },
  background: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(86, 105, 159, 0.18)",
    backgroundColor: "#12172B",
  },
  handleIndicator: {
    width: 52,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(132, 146, 185, 0.32)",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
});
