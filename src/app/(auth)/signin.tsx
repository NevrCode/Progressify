import { authStyles } from "@/assets/styles/auth.style";
import { useTheme } from "@/context/ThemeContext";
import { signIn } from "@/services/authService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const router = useRouter();
  const { theme } = useTheme();
  const style = authStyles(theme);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "Full name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignin = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors and try again");
      return;
    }

    try {
      setLoading(true);
      await signIn({ name, email, password });
      Alert.alert(
        "Success",
        "Account created successfully! Please log in with your new credentials.",
      );
      router.replace("/login");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Registration Failed", error.message);
      } else {
        Alert.alert("Error", "Something went wrong during registration");
      }
      console.log(error);
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
        <Text style={{ marginTop: 10, color: theme.text }}>
          Creating account...
        </Text>
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
        paddingVertical: 40,
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
            Create your account
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

        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Full Name
          </Text>
          <TextInput
            style={[
              style.input,
              {
                borderColor: errors.name ? theme.expense : theme.border,
                borderWidth: 1.2,
              },
            ]}
            placeholder="John Doe"
            placeholderTextColor={theme.textLight}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            editable={!loading}
          />
          {errors.name ? (
            <Text style={{ color: theme.expense, fontSize: 12, marginTop: 4 }}>
              {errors.name}
            </Text>
          ) : null}
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Email Address
          </Text>
          <TextInput
            style={[
              style.input,
              {
                borderColor: errors.email ? theme.expense : theme.border,
                borderWidth: 1.2,
              },
            ]}
            placeholder="your@email.com"
            placeholderTextColor={theme.textLight}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            keyboardType="email-address"
            editable={!loading}
          />
          {errors.email ? (
            <Text style={{ color: theme.expense, fontSize: 12, marginTop: 4 }}>
              {errors.email}
            </Text>
          ) : null}
        </View>

        {/* Password Input */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Password
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderColor: errors.password ? theme.expense : theme.border,
              borderWidth: 1.2,
              borderRadius: 10,
              backgroundColor: theme.card,
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
              placeholder="Min. 6 characters"
              placeholderTextColor={theme.textLight}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password)
                  setErrors({ ...errors, password: undefined });
              }}
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
          {errors.password ? (
            <Text style={{ color: theme.expense, fontSize: 12, marginTop: 4 }}>
              {errors.password}
            </Text>
          ) : null}
        </View>

        {/* Confirm Password Input */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.text,
              marginBottom: 8,
            }}
          >
            Confirm Password
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderColor: errors.confirmPassword
                ? theme.expense
                : theme.border,
              borderWidth: 1.2,
              borderRadius: 10,
              backgroundColor: theme.card,
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
              placeholder="Re-enter your password"
              placeholderTextColor={theme.textLight}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors({ ...errors, confirmPassword: undefined });
              }}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ padding: 8 }}
            >
              <MaterialIcons
                name={showConfirmPassword ? "visibility" : "visibility-off"}
                size={20}
                color={theme.textLight}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={{ color: theme.expense, fontSize: 12, marginTop: 4 }}>
              {errors.confirmPassword}
            </Text>
          ) : null}
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[
            style.loginButton,
            {
              paddingVertical: 8,
              paddingHorizontal: 20,
              marginBottom: 6,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleSignin}
          disabled={loading}
        >
          <Text
            style={[
              style.loginButtonText,
              { fontSize: 16, fontWeight: "bold" },
            ]}
          >
            Create Account
          </Text>
        </TouchableOpacity>

        {/* Divider */}
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
            Already have an account?
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.border,
            }}
          />
        </View>

        {/* Login Link */}
        <TouchableOpacity
          onPress={() => router.replace("/login")}
          style={[
            style.signInButton,
            {
              paddingVertical: 7,
              paddingHorizontal: 20,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          disabled={loading}
        >
          <Text style={[style.signInButtonText, { fontSize: 16 }]}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
