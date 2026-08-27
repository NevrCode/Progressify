import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { confirmPasswordReset } from "@/services/authService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

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
      <FormField label="New password" secureTextEntry value={password} onChangeText={setPassword} placeholder="New password" editable={!submitting} containerStyle={{ marginBottom: 12 }} />
      <FormField label="Confirm new password" secureTextEntry value={confirmation} onChangeText={setConfirmation} placeholder="Confirm new password" editable={!submitting} containerStyle={{ marginBottom: 16 }} />
      <AppButton
        label="Change password"
        disabled={!token}
        loading={submitting}
        onPress={submit}
      />
    </View>
  );
}
