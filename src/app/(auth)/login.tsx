import { authStyles } from "@/assets/styles/auth.style";
import { useTheme } from "@/context/ThemeContext";
import { login } from "@/services/authService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Login() {
  const [email, setEmail] = useState("kevin12keval@gmail.com");
  const [password, setPassword] = useState("mypassword");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const router = useRouter();
  const { theme } = useTheme();
  const style = authStyles(theme);

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
      Alert.alert("Validation Error", "Please fill in all fields correctly");
      return;
    }
    try {
      setLoading(true);
      const data = await login({ email, password });
      await SecureStore.setItemAsync("access_token", data.access_token);
      await SecureStore.setItemAsync("refresh_token", data.refresh_token);
      router.replace("/gymProgression");
    } catch (err) {
      if (err instanceof Error) {
        Alert.alert("Login Failed", err.message);
      } else {
        Alert.alert("Error", "Something went wrong");
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

        {/* Email Input */}
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
          <TextInput
            style={[
              style.input,
              {
                borderColor: emailError ? theme.expense : theme.border,
                borderWidth: 1.2,
              },
            ]}
            placeholder="your@email.com"
            placeholderTextColor={theme.textLight}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
            }}
            keyboardType="email-address"
            editable={!loading}
          />
          {emailError ? (
            <Text style={{ color: theme.expense, fontSize: 12, marginTop: 4 }}>
              {emailError}
            </Text>
          ) : null}
        </View>

        {/* Password Input */}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderColor: theme.border,
              borderWidth: 1.2,
              borderRadius: 8,
              backgroundColor: theme.white,
              paddingRight: 12,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                height: 40,
                paddingHorizontal: 10,
                color: theme.text,
              }}
              placeholder="Enter your password"
              placeholderTextColor={theme.textLight}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ padding: 8 }}
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={20}
                color={theme.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={{ marginBottom: 10, alignItems: "flex-end" }}
          onPress={() =>
            Alert.alert("Forgot Password", "Malas Buat BROK hehhe...")
          }
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

        <TouchableOpacity
          style={[
            style.loginButton,
            {
              paddingVertical: 8,
              marginBottom: 20,
              paddingHorizontal: 40,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text
            style={[
              style.loginButtonText,
              { fontSize: 16, fontWeight: "bold" },
            ]}
          >
            Login
          </Text>
        </TouchableOpacity>

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
            Don't have an account?
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.border,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/signin")}
          style={[
            style.signInButton,
            {
              paddingVertical: 8,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          disabled={loading}
        >
          <Text style={[style.signInButtonText, { fontSize: 16 }]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
