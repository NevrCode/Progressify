import { useTheme } from "@/context/ThemeContext";
import { useAlert } from "@/context/AlertContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  discardFailedMutations,
  retryFailedMutations,
} from "@/services/syncQueueService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

export function SyncStatusBadge() {
  const { theme } = useTheme();
  const { alert } = useAlert();
  const { pending, failed, isSyncing, isOnline } = useSyncStatus();

  if (pending === 0 && failed === 0 && isOnline) return null;

  const hasFailed = failed > 0;
  const color = hasFailed ? theme.expense : theme.primary;
  const label = hasFailed
    ? `${failed} failed - retry`
    : !isOnline
      ? `${pending} pending offline`
      : isSyncing
        ? `Syncing ${pending}`
        : `${pending} pending`;

  const handlePress = () => {
    if (!hasFailed) return;
    alert(
      "Synchronization failed",
      "Retry the failed changes, or discard them from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => void discardFailedMutations(),
        },
        { text: "Retry", onPress: () => void retryFailedMutations() },
      ],
    );
  };

  return (
    <TouchableOpacity
      accessibilityRole={hasFailed ? "button" : "text"}
      accessibilityLabel={label}
      disabled={!hasFailed}
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: color + "15",
          borderColor: color + "40",
        },
      ]}
    >
      {isSyncing && !hasFailed ? (
        <ActivityIndicator size={14} color={color} />
      ) : (
        <MaterialCommunityIcons
          name={hasFailed ? "sync-alert" : isOnline ? "cloud-sync-outline" : "cloud-off-outline"}
          size={15}
          color={color}
        />
      )}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
});
