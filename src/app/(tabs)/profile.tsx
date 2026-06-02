import { profileStyles } from "@/assets/styles/profile.style";
import { MenuButton } from "@/components/profile/menuButton";
import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/hooks/useProfile";
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ComponentProps } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type MaterialCommunityIconName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

type MenuItem = {
  icon: MaterialCommunityIconName;
  label: string;
  description: string;
};

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: "Account",
    items: [
      {
        icon: "account-outline",
        label: "Personal information",
        description: "Name, email, and profile details",
      },
      {
        icon: "email-outline",
        label: "Email preferences",
        description: "Receipts, reports, and updates",
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        icon: "shield-check",
        label: "Privacy and security",
        description: "Password, session, and app lock",
      },
      {
        icon: "palette-outline",
        label: "Appearance",
        description: "Theme and display options",
      },
    ],
  },
];

export default function Profile() {
  const router = useRouter();
  const { theme } = useTheme();
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    router.replace("/login");
  };
  const profileStyless = profileStyles(theme);
  const { data: profileData, isLoading, error, refetch } = useProfile();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={profileStyless.safeArea}>
        <ScrollView
          contentContainerStyle={profileStyless.container}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          <View style={profileStyless.header}>
            <View>
              <Text style={profileStyless.eyebrow}>Account</Text>
              <Text style={profileStyless.title}>Profile</Text>
            </View>
            <TouchableOpacity style={profileStyless.headerButton}>
              <Feather name="edit-2" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={profileStyless.identityCard}>
            <View style={profileStyless.avatar}>
              <Text style={profileStyless.avatarText}>KV</Text>
              <View style={profileStyless.onlineBadge} />
            </View>
            <View style={profileStyless.identityTextWrap}>
              <Text style={profileStyless.name}>{profileData?.name}</Text>
              <Text style={profileStyless.email}>{profileData?.email}</Text>
              <View style={profileStyless.memberChip}>
                <MaterialCommunityIcons
                  name="crown-outline"
                  size={14}
                  color={theme.teriary}
                />
                <Text style={profileStyless.memberChipText}>
                  Premium planner
                </Text>
              </View>
            </View>
          </View>

          <View style={profileStyless.section}>
            <Text style={profileStyless.sectionTitle}>Preferences</Text>
            {menuSections[1].items.map((item) => (
              <MenuButton
                key={item.label}
                item={item}
                onPress={() => {
                  if (item.label === "Appearance") {
                    router.push("/appearance");
                  }
                }}
              />
            ))}
          </View>

          <TouchableOpacity
            style={profileStyless.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.82}
          >
            <View style={profileStyless.logoutIconWrap}>
              <MaterialIcons name="logout" size={22} color={theme.expense} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={profileStyless.logoutText}>Logout</Text>
              <Text style={profileStyless.logoutDescription}>
                End this session on your device
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
