import { profileStyles } from "@/assets/styles/profile.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { MenuButton } from "@/components/profile/menuButton";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/hooks/useProfile";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { logout } from "@/services/authService";
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ComponentProps } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MaterialIconsName = ComponentProps<typeof MaterialIcons>["name"];

type MenuItem = {
  icon: MaterialIconsName;
  label: string;
  description: string;
};

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: "Preferences",
    items: [
      {
        icon: "shield",
        label: "Privacy and security",
        description: "Password, session, and app lock",
      },
      {
        icon: "palette",
        label: "Appearance",
        description: "Theme and display options",
      },
      {
        icon: "new-releases",
        label: "Patch Notes",
        description: "Theme and display options",
      },
    ],
  },
];

const getInitials = (name?: string) => {
  if (!name?.trim()) return "PF";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return initials || "PF";
};

export default function Profile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pending, failed } = useSyncStatus();
  const { theme } = useTheme();
  const { alert } = useAlert();
  const profileStyless = profileStyles(theme);

  const performLogout = async () => {
    await logout();
    queryClient.clear();
    router.replace("/login");
  };

  const handleLogout = () => {
    if (pending === 0 && failed === 0) {
      void performLogout();
      return;
    }

    alert(
      "Discard unsynced changes?",
      `Logging out will remove ${pending + failed} local change${pending + failed === 1 ? "" : "s"} that have not synchronized.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard and logout",
          style: "destructive",
          onPress: () => void performLogout(),
        },
      ],
    );
  };

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const isRefreshing = profileLoading;

  const displayName = profileData?.name || "Progressify User";
  const displayEmail = profileData?.email || "No email connected";

  const refetchAll = () => {
    refetchProfile();
  };

  return (
    <SafeAreaView style={profileStyless.safeArea}>
      <ScrollView
        contentContainerStyle={profileStyless.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <View>
            <Text
              style={{
                color: theme.textLight,
                fontSize: 12,
                fontWeight: "800",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 2,
              }}
            >
              Account
            </Text>
            <Text
              style={{
                color: theme.textBlack,
                fontSize: 28,
                fontWeight: "900",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                letterSpacing: -0.8,
              }}
            >
              Profile
            </Text>
          </View>
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: theme.primary + "15",
              borderWidth: 1.5,
              borderColor: theme.primary + "30",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name="edit-2" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Identity card */}
        <View style={profileStyless.identityCard}>
          <View style={profileStyless.avatar}>
            <Text style={profileStyless.avatarText}>
              {getInitials(profileData?.name)}
            </Text>
            <View style={profileStyless.onlineBadge} />
          </View>
          <View style={profileStyless.identityTextWrap}>
            <Text style={profileStyless.name}>{displayName}</Text>
            <Text style={profileStyless.email}>{displayEmail}</Text>
            <View style={profileStyless.memberChip}>
              <MaterialCommunityIcons
                name="crown-outline"
                size={14}
                color={theme.teriary}
              />
              <Text style={profileStyless.memberChipText}>Premium planner</Text>
            </View>
          </View>
        </View>

        {!!profileError && (
          <View style={profileStyless.noticeCard}>
            <MaterialIcons
              name="info-outline"
              size={18}
              color={theme.expense}
            />
            <Text style={profileStyless.noticeText}>
              Profile data could not refresh. Pull down to try again.
            </Text>
          </View>
        )}

        {/* Preferences section */}
        <ShadowGlowCard
          style={{ padding: 16, backgroundColor: theme.background }}
        >
          <Text style={[profileStyless.sectionTitle, { marginBottom: 12 }]}>
            Preferences
          </Text>
          {menuSections[0].items.map((item) => (
            <MenuButton
              key={item.label}
              item={item}
              onPress={() => {
                if (item.label === "Appearance") router.push("/appearance");
                if (item.label === "Patch Notes") router.push("/changelog");
                if (item.label === "Privacy and security")
                  router.push("/privacy");
              }}
            />
          ))}
        </ShadowGlowCard>

        {/* Logout */}
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

        <TouchableOpacity
          style={[profileStyless.logoutButton, { marginTop: 12 }]}
          onPress={() => router.push("/delete-account")}
          activeOpacity={0.82}
        >
          <View style={profileStyless.logoutIconWrap}>
            <MaterialIcons
              name="delete-forever"
              size={22}
              color={theme.expense}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={profileStyless.logoutText}>Delete account</Text>
            <Text style={profileStyless.logoutDescription}>
              Permanently delete your account and private data
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text
            style={{
              color: theme.textLight,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            Progressify v
            {Constants.expoConfig?.extra?.displayedVersion ?? "1.0.0"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
