import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { deleteMyAccount } from "@/services/authService";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const { alert } = useAlert();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const ready = password.length > 0 && confirmation === "DELETE" && !loading;

  const deleteAccount = async () => {
    try {
      setLoading(true);
      await deleteMyAccount(password, confirmation);
      queryClient.clear();
      alert("Account deleted", "Your account and application data have been permanently deleted.");
      router.replace("/login");
    } catch (error) {
      alert("Deletion failed", error instanceof Error ? error.message : "Unable to delete your account.");
    } finally {
      setLoading(false);
    }
  };

  const requestFinalConfirmation = () => {
    if (!ready) return;
    alert(
      "Permanently delete account?",
      "This cannot be undone. Workout, nutrition, profile, financial and locally cached data will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete permanently", style: "destructive", onPress: () => void deleteAccount() },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => router.back()}><Text style={{ color: theme.primary }}>Back</Text></TouchableOpacity>
        <Text style={{ color: theme.textBlack, fontSize: 28, fontWeight: "800" }}>Delete account</Text>
        <Text style={{ color: theme.textLight, lineHeight: 22 }}>
          This permanently removes your account, sessions, workout history, nutrition diary, profile, goals, financial records, uploads and offline copies on this device.
        </Text>
        <FormField
          label="Current password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Enter your password"
        />
        <FormField
          label="Type DELETE to confirm"
          accessibilityLabel="Type DELETE to confirm account deletion"
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          placeholder="DELETE"
        />
        <AppButton
          label="Delete permanently"
          variant="destructive"
          accessibilityHint="This action cannot be undone"
          disabled={!ready}
          loading={loading}
          onPress={requestFinalConfirmation}
        />
        <TouchableOpacity accessibilityRole="link" accessibilityLabel="Read account deletion policy" onPress={() => router.push("/delete-account-info")}>
          <Text style={{ color: theme.primary, textAlign: "center" }}>Read the account deletion policy</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
