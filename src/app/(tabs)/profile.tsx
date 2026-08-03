import { profileStyles } from "@/assets/styles/profile.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { AppButton } from "@/components/base/app-button";
import { PageHeader } from "@/components/base/page-header";
import { StatePanel } from "@/components/base/state-panel";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { MenuButton } from "@/components/profile/menuButton";
import { SyncStatusPanel } from "@/components/profile/sync-status-panel";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useOnboardingPreference } from "@/hooks/useOnboardingPreference";
import { useProfile } from "@/hooks/useProfile";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { logout } from "@/services/authService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ComponentProps } from "react";
import { RefreshControl, Text, View } from "react-native";
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
        icon: "straighten",
        label: "Measurements",
        description: "Metric or imperial units",
      },
      {
        icon: "checklist",
        label: "Setup checklist",
        description: "Review your first steps",
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
  const [, setOnboardingPreference] = useOnboardingPreference();
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
      <TabScreenScrollView
        contentContainerStyle={profileStyless.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} />
        }
      >
        <PageHeader eyebrow="Account" title="Profile" showSyncStatus={false} />

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
                color={theme.tertiary}
              />
              <Text style={profileStyless.memberChipText}>Premium planner</Text>
            </View>
          </View>
        </View>

        {!!profileError && (
          <StatePanel
            variant="error"
            compact
            title="Profile refresh failed"
            message="Your saved profile is still displayed. Try loading the latest data again."
            primaryAction={{
              label: "Retry",
              onPress: () => refetchProfile(),
            }}
          />
        )}

        <SyncStatusPanel />

        {/* Preferences section */}
        <ShadowGlowCard
          style={{ padding: 16 }}
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
                if (item.label === "Measurements") router.push("/measurementPreferences");
                if (item.label === "Setup checklist") {
                  setOnboardingPreference("review");
                  router.push("/home");
                }
                if (item.label === "Patch Notes") router.push("/changelog");
                if (item.label === "Privacy and security")
                  router.push("/privacy");
              }}
            />
          ))}
        </ShadowGlowCard>

        {/* Logout */}
        <AppButton
          label="Logout"
          description="End this session on your device"
          variant="secondary"
          onPress={handleLogout}
          leftIcon={
            <MaterialIcons name="logout" size={22} color={theme.primary} />
          }
          style={{ justifyContent: "flex-start", paddingVertical: 13 }}
        />

        <AppButton
          label="Delete account"
          description="Permanently delete your account and private data"
          variant="destructive"
          onPress={() => router.push("/delete-account")}
          leftIcon={
            <MaterialIcons
              name="delete-forever"
              size={22}
              color={theme.expense}
            />
          }
          style={{ justifyContent: "flex-start", paddingVertical: 13 }}
        />

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
      </TabScreenScrollView>
    </SafeAreaView>
  );
}
