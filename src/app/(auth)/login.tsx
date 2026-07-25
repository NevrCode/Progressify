import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { login } from "@/services/authService";
import { saveAuthSession } from "@/services/authSessionService";
import { MaterialIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const router = useRouter();
  const { theme } = useTheme();
  const { alert } = useAlert();

  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(text)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleLogin = async () => {
    if (!validateEmail(email) || !password) {
      alert("Validation Error", "Please fill in all fields correctly");
      return;
    }
    try {
      setLoading(true);
      const data = await login({ email, password });
      await saveAuthSession(data);
      router.replace("/(tabs)/home");
    } catch (err) {
      if (err instanceof Error) {
        alert("Login Failed", err.message);
      } else {
        alert("Error", "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 10, color: theme.text }}>Logging in...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.background,
        paddingHorizontal: 20,
      }}
    >
      <View style={{ width: "100%", maxWidth: 400 }}>
        {/* Header Section */}
        <View style={{ marginBottom: 40, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: theme.primary,
              marginBottom: 8,
            }}
          >
            Progressify
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.textLight,
              marginBottom: 20,
            }}
          >
            Welcome back!
          </Text>
          <View
            style={{
              width: 60,
              height: 3,
              backgroundColor: theme.primary,
              borderRadius: 2,
            }}
          />
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 4,
            }}
          >
            Email Address
          </Text>
          <FormField
            accessibilityLabel="Email Address"
            error={emailError}
            placeholder="your@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
            }}
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 4,
            }}
          >
            Password
          </Text>
          <FormField
            accessibilityLabel="Password"
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            trailing={
              <IconButton
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                selected={showPassword}
                size="compact"
                variant="ghost"
                onPress={() => setShowPassword(!showPassword)}
                icon={
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={theme.textLight}
                  />
                }
              />
            }
          />
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel="Forgot password"
          style={{ marginBottom: 10, alignItems: "flex-end" }}
          onPress={() => router.push("/forgot-password" as Href)}
        >
          <Text
            style={{
              color: theme.primary,
              fontSize: 13,
              fontWeight: "600",
              textDecorationLine: "underline",
            }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <AppButton
          label="Login"
          loading={loading}
          onPress={handleLogin}
          style={{ marginBottom: 20 }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.border,
            }}
          />
          <Text
            style={{
              marginHorizontal: 10,
              color: theme.textLight,
              fontSize: 12,
            }}
          >
            Don&apos;t have an account?
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.border,
            }}
          />
        </View>

        <AppButton
          label="Create Account"
          variant="secondary"
          onPress={() => router.replace("/signin")}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}
