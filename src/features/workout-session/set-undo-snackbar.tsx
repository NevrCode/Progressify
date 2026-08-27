import type { ThemeType } from "@/constants/colors";
import { Text, TouchableOpacity, View } from "react-native";

export function SetUndoSnackbar({
  setNumber,
  onUndo,
  theme,
}: {
  setNumber: number;
  onUndo: () => void;
  theme: ThemeType;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        alignItems: "center",
        backgroundColor: theme.textBlack,
        borderRadius: 14,
        bottom: 92,
        flexDirection: "row",
        gap: 16,
        left: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: "absolute",
        right: 20,
      }}
    >
      <Text style={{ color: theme.background, flex: 1, fontSize: 13, fontWeight: "700" }}>
        Set {setNumber} removed
      </Text>
      <TouchableOpacity accessibilityLabel={`Undo removing set ${setNumber}`} accessibilityRole="button" onPress={onUndo}>
        <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "900" }}>UNDO</Text>
      </TouchableOpacity>
    </View>
  );
}
