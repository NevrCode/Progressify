import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { confirmPasswordReset } from "@/services/authService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const { alert } = useAlert();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!token) {
      alert("Invalid link", "This password reset link is incomplete.");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      alert("Invalid password", "Use between 8 and 72 characters.");
      return;
    }
    if (password !== confirmation) {
      alert("Passwords do not match", "Enter the same password in both fields.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      alert("Password changed", "Sign in again with your new password.", [
        { text: "Continue", onPress: () => router.replace("/login") },
      ]);
    } catch (error) {
      alert("Reset failed", error instanceof Error ? error.message : "Please request a new link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: theme.background }}>
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: "800", marginBottom: 10 }}>Choose a new password</Text>
      <Text style={{ color: theme.textLight, marginBottom: 24 }}>Reset links expire and can only be used once.</Text>
      <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={theme.textLight} editable={!submitting} style={{ color: theme.text, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 12 }} />
      <TextInput secureTextEntry value={confirmation} onChangeText={setConfirmation} placeholder="Confirm new password" placeholderTextColor={theme.textLight} editable={!submitting} style={{ color: theme.text, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 16 }} />
      <TouchableOpacity disabled={submitting || !token} onPress={submit} style={{ padding: 14, borderRadius: 12, backgroundColor: theme.primary, opacity: submitting || !token ? 0.6 : 1 }}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Change password</Text>}
      </TouchableOpacity>
    </View>
  );
}
