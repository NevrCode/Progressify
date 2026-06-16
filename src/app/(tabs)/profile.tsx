import { profileStyles } from "@/assets/styles/profile.style";
import { MenuButton } from "@/components/profile/menuButton";
import { useTheme } from "@/context/ThemeContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  useNutritionProfile,
  useTodayDiarySummary,
} from "@/hooks/useNutrition";
import { useProfile } from "@/hooks/useProfile";
import { AccountResponse } from "@/services/accountService";
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ComponentProps, useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type MaterialIconsName = ComponentProps<typeof MaterialIcons>["name"];

type MenuItem = {
  icon: MaterialIconsName;
  label: string;
  description: string;
};

type QuickAction = {
  icon: MaterialIconsName;
  title: string;
  meta: string;
  onPress: () => void;
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

const statusColor = (status?: string, theme?: any) => {
  if (status === "ON_TRACK") return theme?.income ?? "#2ecc71";
  if (status === "OVER") return theme?.expense ?? "#e74c3c";
  return theme?.textLight ?? "#aaa";
};

export default function Profile() {
  const router = useRouter();
  const { theme } = useTheme();
  const profileStyless = profileStyles(theme);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    router.replace("/login");
  };

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const {
    data: accounts,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useAccounts();
  const {
    data: gymDashboard,
    isLoading: gymLoading,
    refetch: refetchGym,
  } = useGymDashboard();
  const { data: nutritionProfile } = useNutritionProfile();
  const { data: todaySummary, refetch: refetchSummary } =
    useTodayDiarySummary();

  const accountList = useMemo(() => {
    const payload = accounts as unknown;
    if (Array.isArray(payload)) return payload as AccountResponse[];
    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      Array.isArray((payload as { data: unknown }).data)
    ) {
      return (payload as { data: AccountResponse[] }).data;
    }
    return [];
  }, [accounts]);

  const exerciseProgressions = useMemo(
    () => gymDashboard?.exercise_progressions ?? [],
    [gymDashboard],
  );
  const totalBalance = useMemo(
    () => accountList.reduce((t, a) => t + a.balance, 0),
    [accountList],
  );
  const totalSessions = useMemo(
    () =>
      exerciseProgressions.reduce(
        (t, e) => t + (e.exercise_sessions?.length ?? 0),
        0,
      ),
    [exerciseProgressions],
  );

  const profileCompletion = useMemo(() => {
    const checks = [
      !!profileData?.name,
      !!profileData?.email,
      !!profileData?.profile_picture_url,
      accountList.length > 0,
      exerciseProgressions.length > 0,
      !!nutritionProfile, // nutrition profile counts too
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    accountList.length,
    exerciseProgressions.length,
    profileData,
    nutritionProfile,
  ]);

  const isRefreshing = profileLoading || accountsLoading || gymLoading;

  const displayName = profileData?.name || "Progressify User";
  const displayEmail = profileData?.email || "No email connected";

  const quickActions: QuickAction[] = [
    {
      icon: "sports",
      title: "Training Hub",
      meta: `${exerciseProgressions.length} exercises tracked`,
      onPress: () => router.push("/gymProgression"),
    },
    {
      icon: "food-apple-outline" as MaterialIconsName,
      title: "Nutrition Tracker",
      meta: nutritionProfile
        ? `Goal: ${todaySummary?.goals?.calories_goal?.toFixed(0) ?? "—"} kcal/day`
        : "Set up your nutrition profile",
      onPress: () => router.push("/nutritionProfile"),
    },
    {
      icon: "palette",
      title: "Appearance",
      meta: "Theme and display",
      onPress: () => router.push("/appearance"),
    },
  ];

  const refetchAll = () => {
    refetchProfile();
    refetchAccounts();
    refetchGym();
    refetchSummary();
  };

  const calProg = todaySummary?.progress?.calories;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={profileStyless.safeArea}>
        <ScrollView
          contentContainerStyle={profileStyless.container}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} />
          }
        >
          {/* Header */}
          <View style={profileStyless.header}>
            <View>
              <Text style={profileStyless.eyebrow}>Account</Text>
              <Text style={profileStyless.title}>Profile</Text>
            </View>
            <TouchableOpacity style={profileStyless.headerButton}>
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
                <Text style={profileStyless.memberChipText}>
                  Premium planner
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          {/* <View style={profileStyless.statsCard}>
            <View style={profileStyless.statItem}>
              <Text style={profileStyless.statValue}>{profileCompletion}%</Text>
              <Text style={profileStyless.statLabel}>Profile</Text>
              <View style={profileStyless.statDivider} />
            </View>
            <View style={profileStyless.statItem}>
              <Text style={profileStyless.statValue}>{accountList.length}</Text>
              <Text style={profileStyless.statLabel}>Accounts</Text>
              <View style={profileStyless.statDivider} />
            </View>
            <View style={profileStyless.statItem}>
              <Text style={profileStyless.statValue}>
                {exerciseProgressions.length}
              </Text>
              <Text style={profileStyless.statLabel}>Exercises</Text>
            </View>
          </View> */}

          {/* <View style={profileStyless.insightGrid}>
            <View style={profileStyless.insightCard}>
              <View style={profileStyless.insightIconWrap}>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={20}
                  color={theme.primary}
                />
              </View>
              <Text style={profileStyless.insightLabel}>Total balance</Text>
              <Text style={profileStyless.insightValue}>
                {formatRupiah(totalBalance)}
              </Text>
              <Text style={profileStyless.insightMeta}>
                Across {accountList.length} accounts
              </Text>
            </View>
            <View style={profileStyless.insightCard}>
              <View style={profileStyless.insightIconWrap}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={20}
                  color={theme.primary}
                />
              </View>
              <Text style={profileStyless.insightLabel}>Workout log</Text>
              <Text style={profileStyless.insightValue}>{totalSessions}</Text>
              <Text style={profileStyless.insightMeta}>
                Saved training sessions
              </Text>
            </View>
          </View> */}

          {/* ── NUTRITION SUMMARY CARD (new) ─────────────────────────────── */}
          {/* <TouchableOpacity
            style={profileStyless.insightCard ?? profileStyless.statsCard}
            activeOpacity={0.85}
            onPress={() => router.push("/nutritionProfile")}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialCommunityIcons
                  name="food-apple-outline"
                  size={18}
                  color={theme.primary}
                />
                <Text style={profileStyless.insightLabel}>
                  Today's Nutrition
                </Text>
              </View>
              {todaySummary && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: statusColor(todaySummary.status, theme),
                  }}
                >
                  {todaySummary.status === "ON_TRACK"
                    ? "On Track ✓"
                    : todaySummary.status === "OVER"
                      ? "Over Goal ↑"
                      : "Under Goal ↓"}
                </Text>
              )}
            </View>

            {!nutritionProfile ? (
              <Text style={profileStyless.insightMeta}>
                Tap to set up your nutrition profile →
              </Text>
            ) : calProg ? (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text style={profileStyless.insightMeta}>
                    {calProg.consumed.toFixed(0)} / {calProg.goal.toFixed(0)}{" "}
                    kcal
                  </Text>
                  <Text
                    style={[
                      profileStyless.insightMeta,
                      { color: statusColor(todaySummary?.status, theme) },
                    ]}
                  >
                    {calProg.percentage.toFixed(0)}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.border ?? "#eee",
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      width: `${Math.min(calProg.percentage, 100)}%`,
                      backgroundColor: statusColor(todaySummary?.status, theme),
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 8,
                  }}
                >
                  <Text style={profileStyless.insightMeta}>
                    P: {todaySummary?.progress?.protein?.consumed?.toFixed(1)}g
                  </Text>
                  <Text style={profileStyless.insightMeta}>
                    C:{" "}
                    {todaySummary?.progress?.carbohydrate?.consumed?.toFixed(1)}
                    g
                  </Text>
                  <Text style={profileStyless.insightMeta}>
                    F: {todaySummary?.progress?.fat?.consumed?.toFixed(1)}g
                  </Text>
                </View>
              </>
            ) : (
              <Text style={profileStyless.insightMeta}>
                No food logged today →
              </Text>
            )}
          </TouchableOpacity> */}

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

          {/* Quick actions */}
          {/* <View style={profileStyless.section}>
            <Text style={profileStyless.sectionTitle}>Next steps</Text>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.title}
                style={profileStyless.actionRow}
                activeOpacity={0.82}
                onPress={action.onPress}
              >
                <View style={profileStyless.menuIconWrap}>
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={21}
                    color={theme.primary}
                  />
                </View>
                <View style={profileStyless.menuTextWrap}>
                  <Text style={profileStyless.menuLabel}>{action.title}</Text>
                  <Text style={profileStyless.menuDescription}>
                    {action.meta}
                  </Text>
                </View>
                <MaterialIcons
                  name="keyboard-arrow-right"
                  size={24}
                  color={theme.textLight}
                />
              </TouchableOpacity>
            ))}
          </View> */}

          {/* Account section */}
          {/* <View style={profileStyless.section}>
            <Text style={profileStyless.sectionTitle}>Account</Text>
            {menuSections[0].items.map((item) => (
              <MenuButton key={item.label} item={item} onPress={() => {}} />
            ))}
          </View> */}

          {/* Preferences section */}
          <View style={profileStyless.section}>
            <Text style={profileStyless.sectionTitle}>Preferences</Text>
            {menuSections[0].items.map((item) => (
              <MenuButton
                key={item.label}
                item={item}
                onPress={() => {
                  if (item.label === "Appearance") router.push("/appearance");
                  if (item.label === "Patch Notes") router.push("/changelog");
                }}
              />
            ))}
          </View>

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

          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text
              style={{
                color: theme.textLight,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Progressify v{Constants.expoConfig?.version ?? "1.0.0"}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
