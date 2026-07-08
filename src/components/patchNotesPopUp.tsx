import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import { changeTypeMeta, PatchNote } from "@/data/changeLog";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface PatchNotesPopupProps {
  visible: boolean;
  patch: PatchNote;
  onDismiss: () => void;
}

export function PatchNotesPopup({
  visible,
  patch,
  onDismiss,
}: PatchNotesPopupProps) {
  const { theme } = useTheme();
  const style = gymStyles(theme);
  const router = useRouter();

  const handleViewAll = () => {
    onDismiss();
    router.push("/changelog");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={style.modalBackdrop}>
        <View style={[style.modalCard, { maxHeight: "75%" }]}>
          {/* Header */}
          <View style={style.modalHeader}>
            <View>
              <Text
                style={[
                  style.listMeta,
                  { color: theme.primary, fontWeight: "700", marginBottom: 2 },
                ]}
              >
                What&apos;s New — v{patch.version}
              </Text>
              <Text style={style.modalTitle}>{patch.title}</Text>
            </View>
            <TouchableOpacity onPress={onDismiss}>
              <MaterialIcons name="close" size={22} color={theme.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={[style.listMeta, { marginBottom: 16 }]}>
            {patch.date}
          </Text>

          {/* Changes list */}
          <ScrollView
            contentContainerStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {patch.changes.map((change, i) => {
              const meta = changeTypeMeta[change.type];
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: meta.color + "15",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        style.listMeta,
                        {
                          color: meta.color,
                          fontWeight: "700",
                          fontSize: 11,
                          marginBottom: 2,
                        },
                      ]}
                    >
                      {meta.label.toUpperCase()}
                    </Text>
                    <Text style={style.listTitle}>{change.text}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <TouchableOpacity
              style={[style.filterChip, { flex: 1 }]}
              onPress={handleViewAll}
            >
              <Text style={style.filterChipText}>View all changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[style.primaryButton, { flex: 1.5 }]}
              onPress={onDismiss}
            >
              <Text style={style.primaryButtonText}>Got it 🎉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
