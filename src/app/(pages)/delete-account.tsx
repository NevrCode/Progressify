import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { deleteMyAccount } from "@/services/authService";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
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
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: theme.primary }}>Back</Text></TouchableOpacity>
        <Text style={{ color: theme.textBlack, fontSize: 28, fontWeight: "800" }}>Delete account</Text>
        <Text style={{ color: theme.textLight, lineHeight: 22 }}>
          This permanently removes your account, sessions, workout history, nutrition diary, profile, goals, financial records, uploads and offline copies on this device.
        </Text>
        <Text style={{ color: theme.text, fontWeight: "700" }}>Current password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, color: theme.text, backgroundColor: theme.card }}
          placeholder="Enter your password"
          placeholderTextColor={theme.textLight}
        />
        <Text style={{ color: theme.text, fontWeight: "700" }}>Type DELETE to confirm</Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, color: theme.text, backgroundColor: theme.card }}
          placeholder="DELETE"
          placeholderTextColor={theme.textLight}
        />
        <TouchableOpacity
          disabled={!ready}
          onPress={requestFinalConfirmation}
          style={{ backgroundColor: theme.expense, opacity: ready ? 1 : 0.45, padding: 16, borderRadius: 12, alignItems: "center" }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Delete permanently</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/delete-account-info")}>
          <Text style={{ color: theme.primary, textAlign: "center" }}>Read the account deletion policy</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
