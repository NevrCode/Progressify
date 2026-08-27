import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { signIn } from "@/services/authService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
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
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const { alert } = useAlert();
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptedLegal?: string;
  }>({});
  const router = useRouter();
  const { theme } = useTheme();

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
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!acceptedLegal) {
      newErrors.acceptedLegal =
        "You must accept the Terms and acknowledge the Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignin = async () => {
    if (!validateForm()) {
      alert("Validation Error", "Please fix the errors and try again");
      return;
    }

    try {
      setLoading(true);
      await signIn({ name, email, password, legalAccepted: acceptedLegal });
      alert(
        "Success",
        "Account created successfully! Please log in with your new credentials.",
      );
      router.replace("/login");
    } catch (error) {
      if (error instanceof Error) {
        alert("Registration Failed", error.message);
      } else {
        alert("Error", "Something went wrong during registration");
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
          <FormField
            accessibilityLabel="Full Name"
            error={errors.name}
            placeholder="John Doe"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            editable={!loading}
          />
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
          <FormField
            accessibilityLabel="Email Address"
            error={errors.email}
            placeholder="your@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            keyboardType="email-address"
            editable={!loading}
          />
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
          <FormField
            accessibilityLabel="Password"
            error={errors.password}
            placeholder="Min. 8 characters"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password)
                setErrors({ ...errors, password: undefined });
            }}
            editable={!loading}
            trailing={
              <IconButton
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                icon={
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={theme.textLight}
                  />
                }
                onPress={() => setShowPassword(!showPassword)}
                selected={showPassword}
                size="compact"
                variant="ghost"
              />
            }
          />
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
          <FormField
            accessibilityLabel="Confirm Password"
            error={errors.confirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: undefined });
            }}
            editable={!loading}
            trailing={
              <IconButton
                accessibilityLabel={
                  showConfirmPassword
                    ? "Hide password confirmation"
                    : "Show password confirmation"
                }
                icon={
                  <MaterialIcons
                    name={
                      showConfirmPassword ? "visibility" : "visibility-off"
                    }
                    size={20}
                    color={theme.textLight}
                  />
                }
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                selected={showConfirmPassword}
                size="compact"
                variant="ghost"
              />
            }
          />
        </View>

        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityLabel="Accept Terms and Privacy Policy"
          accessibilityState={{ checked: acceptedLegal }}
          onPress={() => {
            setAcceptedLegal((value) => !value);
            if (errors.acceptedLegal) {
              setErrors({ ...errors, acceptedLegal: undefined });
            }
          }}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <MaterialIcons
            name={acceptedLegal ? "check-box" : "check-box-outline-blank"}
            size={22}
            color={errors.acceptedLegal ? theme.expense : theme.primary}
          />
          <Text style={{ flex: 1, color: theme.textLight, lineHeight: 20 }}>
            I accept the Terms of Service and acknowledge the Privacy Policy.
          </Text>
        </TouchableOpacity>
        <View
          style={{
            flexDirection: "row",
            gap: 18,
            marginBottom: 12,
            marginLeft: 32,
          }}
        >
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Read Terms"
            hitSlop={6}
            onPress={() => router.push("/terms")}
          >
            <Text style={{ color: theme.primary }}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Read Privacy Policy"
            hitSlop={6}
            onPress={() => router.push("/privacy")}
          >
            <Text style={{ color: theme.primary }}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        {errors.acceptedLegal ? (
          <Text style={{ color: theme.expense, fontSize: 12, marginBottom: 12 }}>
            {errors.acceptedLegal}
          </Text>
        ) : null}

        {/* Sign Up Button */}
        <AppButton
          label="Create Account"
          loading={loading}
          onPress={handleSignin}
          style={{ marginBottom: 6 }}
        />

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
        <AppButton
          label="Back to Login"
          variant="secondary"
          onPress={() => router.replace("/login")}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}
