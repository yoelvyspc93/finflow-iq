import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

type BottomSheetProps = {
  children: React.ReactNode;
  onClose: () => void;
  visible: boolean;
};

export function BottomSheet({ children, onClose, visible }: BottomSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5, 8, 18, 0.62)",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#0D1427",
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.32)",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
});
