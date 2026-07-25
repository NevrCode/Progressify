import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { requestPasswordReset } from "@/services/authService";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { alert } = useAlert();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      alert("Email required", "Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(normalized);
      setSubmitted(true);
    } catch (error) {
      alert("Request failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: theme.background }}>
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: "800", marginBottom: 10 }}>
        Reset password
      </Text>
      <Text style={{ color: theme.textLight, marginBottom: 24, lineHeight: 21 }}>
        Enter your email and we will send a secure reset link if an account exists.
      </Text>
      {submitted ? (
        <>
          <Text style={{ color: theme.text, lineHeight: 22, marginBottom: 24 }}>
            If an account exists for that email, reset instructions have been sent.
          </Text>
          <AppButton
            label="Back to login"
            onPress={() => router.replace("/login")}
          />
        </>
      ) : (
        <>
          <FormField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="Email address"
            placeholderTextColor={theme.textLight}
            editable={!submitting}
            containerStyle={{ marginBottom: 16 }}
          />
          <AppButton
            label="Send reset link"
            loading={submitting}
            onPress={submit}
          />
          <AppButton
            label="Cancel"
            onPress={() => router.back()}
            variant="ghost"
          />
        </>
      )}
    </View>
  );
}
