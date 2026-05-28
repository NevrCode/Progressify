import { authStyles } from "@/assets/styles/auth.style";
import { useTheme } from "@/context/ThemeContext";
import { login } from "@/services/authService";
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
  const router = useRouter();
  const { theme } = useTheme();
  const style = authStyles(theme);
  const handleLogin = async () => {
    try {
      setLoading(true);
      const data = await login({ email, password });
      await SecureStore.setItemAsync("access_token", data.access_token);
      await SecureStore.setItemAsync("refresh_token", data.refresh_token);
      router.replace("/gymProgression");
    } catch (err) {
      if (err instanceof Error) {
        Alert.alert("Error", err.message);
      } else {
        Alert.alert("Error", "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <ActivityIndicator />;
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: style.container.backgroundColor,
      }}
    >
      <View style={style.container}>
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <TextInput
                style={style.input}
                placeholder="Username"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <TextInput
                style={style.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>
          <View
            style={{
              flexDirection: "row-reverse",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={[style.loginButton, { marginTop: 10 }]}
              onPress={handleLogin}
            >
              <Text style={style.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                router.replace("/signin");
              }}
              style={[style.signInButton, { marginTop: 10 }]}
            >
              <Text style={style.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
