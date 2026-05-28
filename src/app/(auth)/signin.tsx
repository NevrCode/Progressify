import { authStyles } from "@/assets/styles/auth.style";
import { COLORS } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { signIn } from "@/services/authService";
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
  const router = useRouter();
  const { theme } = useTheme();

  const style = authStyles(theme);

  const handleSignin = async () => {
    try {
      setLoading(true);
      await signIn({ name, email, password });
      Alert.alert("Success", "Account created successfully, please login");
      router.replace("/login");
    } catch (error) {
      console.log(error);
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
        backgroundColor: COLORS.background,
      }}
    >
      <View style={{ gap: 10, padding: 20 }}>
        <View style={{ alignSelf: "center", marginBottom: 20 }}>
          <Text style={style.headerText}>Sign In</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text>Name </Text>
          </View>
          <View>
            <TextInput
              style={style.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
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
            <Text>Username </Text>
          </View>
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
            <Text>Password </Text>
          </View>
          <View>
            <TextInput
              style={[style.input]}
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
            onPress={handleSignin}
            style={[style.signInButton, { marginTop: 10 }]}
          >
            <Text style={style.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              router.replace("/(auth)/login");
            }}
            style={[style.loginButton, { marginTop: 10 }]}
          >
            <Text style={style.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
