import { gymStyles } from "@/assets/styles/gym.style";
import { FadeSlideIn } from "@/components/animations/fade-slide-in";
import { SectionLabel } from "@/components/base/SectionLabel";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { PageHeader } from "@/components/base/page-header";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { SplitSummaryCard } from "@/components/gym/SplitSummaryCard";
import { WeekStreak } from "@/components/gym/WeekStreak";
import {
  NutritionSummarySkeleton,
  RecentProgressSkeleton,
} from "@/components/home/home-card-skeletons";
import { MacroDonutChart } from "@/components/nutrition/macroDonutChart";
import { WaterTracker } from "@/components/nutrition/WaterTracker";
import { useTheme } from "@/context/ThemeContext";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
  useNutritionProfile,
  useTodayDiarySummary,
} from "@/hooks/useNutrition";
import { useProfile } from "@/hooks/useProfile";
import {
  ExerciseProgressionDTO,
  ExerciseSessionDTO,
} from "@/services/gymService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDateForApi = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const todayStr = formatDateForApi(new Date());

const statusColor = (status?: string, theme?: any) => {
  if (status === "ON_TRACK") return theme?.income ?? "#2ecc71";
  if (status === "OVER") return theme?.expense ?? "#e74c3c";
  return theme?.textLight ?? "#aaa";
};

const statusLabel = (status?: string) => {
  if (status === "ON_TRACK") return "On track ✓";
  if (status === "OVER") return "Over goal ↑";
  return "Under goal ↓";
};

const getExerciseSessions = (
  exercise: ExerciseProgressionDTO,
): ExerciseSessionDTO[] => exercise.exercise_sessions ?? [];

const getSessionDate = (session: ExerciseSessionDTO) =>
  session.session_date ?? "";

const toDateSortValue = (value?: string) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatShortDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const normalizeSplit = (split?: string): "PUSH" | "PULL" | "LEGS" => {
  const n = split?.toUpperCase();
  if (n === "PULL" || n === "LEGS") return n;
  return "PUSH";
};

const displaySplit = (split?: string) => {
  const n = normalizeSplit(split);
  return n.charAt(0) + n.slice(1).toLowerCase();
};

const estimate1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

const getLatest1RM = (exercise: ExerciseProgressionDTO): number => {
  const sessions = getExerciseSessions(exercise);
  if (!sessions.length) return 0;
  const latest = [...sessions].sort(
    (a, b) =>
      toDateSortValue(getSessionDate(b)) - toDateSortValue(getSessionDate(a)),
  )[0];
  const sets = latest?.sets ?? [];
  if (!sets.length) return 0;
  return Math.max(...sets.map((s) => estimate1RM(s.weight, s.reps)));
};

const getLastSessionDate = (exercise: ExerciseProgressionDTO): string => {
  const sessions = getExerciseSessions(exercise);
  if (!sessions.length) return "";
  return (
    [...sessions].sort(
      (a, b) =>
        toDateSortValue(getSessionDate(b)) - toDateSortValue(getSessionDate(a)),
    )[0]?.session_date ?? ""
  );
};

const get1RMTrend = (
  exercise: ExerciseProgressionDTO,
): { value: string; isPositive: boolean } | null => {
  const sessions = exercise.exercise_sessions ?? [];
  if (sessions.length < 2) return null;

  const sorted = [...sessions].sort(
    (a, b) =>
      toDateSortValue(getSessionDate(a)) - toDateSortValue(getSessionDate(b)),
  );

  const latestSession = sorted[sorted.length - 1];
  const previousSession = sorted[sorted.length - 2];

  const latestSets = latestSession?.sets ?? [];
  const previousSets = previousSession?.sets ?? [];

  if (!latestSets.length || !previousSets.length) return null;

  const latestMax1RM = Math.max(
    ...latestSets.map((s) => s.weight * (1 + s.reps / 30)),
  );
  const previousMax1RM = Math.max(
    ...previousSets.map((s) => s.weight * (1 + s.reps / 30)),
  );

  if (previousMax1RM <= 0) return null;

  const diff = latestMax1RM - previousMax1RM;
  const pct = (diff / previousMax1RM) * 100;

  if (Math.abs(diff) < 0.1) return null;

  return {
    value: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg (${diff > 0 ? "+" : ""}${pct.toFixed(0)}%)`,
    isPositive: diff > 0,
  };
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = gymStyles(theme);
  const router = useRouter();
  const homeCardStyle = {
    backgroundColor: theme.background,
    borderColor: theme.primary + "20",
    borderWidth: 1.5,
  };

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useNutritionProfile();

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useTodayDiarySummary(todayStr);

  const {
    data: dashboard,
    isLoading: gymLoading,
    isFetching: gymFetching,
    isError: gymError,
    refetch: refetchGym,
  } = useGymDashboard();
  const {
    data: profileData,
    isLoading: userProfileLoading,
    refetch: refetchUserProfile,
  } = useProfile();

  const {
    storedSession,
    hasActiveSession,
    checking,
    refresh: refreshActiveSession,
    discard,
  } = useActiveSession();

  const [activeTab, setActiveTab] = useState<"NUTRITION" | "TRAINING">(
    "NUTRITION",
  );

  const isRefreshing =
    profileLoading ||
    summaryLoading ||
    gymLoading ||
    gymFetching ||
    checking ||
    userProfileLoading;

  const refresh = () => {
    refetchProfile();
    refetchSummary();
    refetchGym();
    refreshActiveSession();
    refetchUserProfile();
  };

  // Derive data
  const prog = summary?.progress;
  const calProg = prog?.calories;
  const calorieColor = calProg
    ? calProg.percentage > 110
      ? (theme.expense ?? "#e74c3c")
      : calProg.percentage >= 85
        ? (theme.income ?? "#2ecc71")
        : (theme.textLight ?? "#999")
    : (theme.primary ?? "#2ecc71");

  const exercises = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  // 3 most recently trained exercises
  const recentExercises = useMemo(
    () =>
      [...exercises]
        .filter((e) => getLastSessionDate(e))
        .sort(
          (a, b) =>
            toDateSortValue(getLastSessionDate(b)) -
            toDateSortValue(getLastSessionDate(a)),
        )
        .slice(0, 3),
    [exercises],
  );

  // Derive a simple 7-day workout streak (days that have any session ending today)
  const streakDays = useMemo(() => {
    const filledDays = Array(7).fill(false);
    const today = new Date();
    // Monday = index 0
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const sessionDates = new Set<string>();
    for (const ex of exercises) {
      for (const session of getExerciseSessions(ex)) {
        const d = getSessionDate(session);
        if (d) sessionDates.add(d.slice(0, 10));
      }
    }
    for (let i = 0; i <= dayOfWeek; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (dayOfWeek - i));
      filledDays[i] = sessionDates.has(formatDateForApi(d));
    }
    return filledDays;
  }, [exercises]);

  const workoutDaysThisWeek = streakDays.filter(Boolean).length;

  const getGreeting = () => {
    const hours = new Date().getHours();
    const name = profileData?.name ? `, ${profileData.name}` : "";
    if (hours < 12) return `Good morning${name}`;
    if (hours < 17) return `Good afternoon${name}`;
    return `Good evening${name}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TabScreenScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
      >
        {/* ── Header ── */}
        <FadeSlideIn>
          <PageHeader
            eyebrow={getGreeting()}
            title="Progressify"
            icon={
              <MaterialCommunityIcons
                name="account"
                size={24}
                color={theme.primary}
              />
            }
            iconAccessibilityLabel="Open profile"
            onIconPress={() => router.push("/profile")}
          />
        </FadeSlideIn>

        {/* ── Quick actions ── */}
        <SectionLabel>Quick actions</SectionLabel>
        <FadeSlideIn
          delay={40}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 8,
            marginVertical: 12,
          }}
        >
          {/* Action 1 */}
          <TouchableOpacity
            onPress={() => router.push("/foodDiary")}
            activeOpacity={0.75}
            style={{ alignItems: "center", flex: 1 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: theme.primary + "15",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 6,
                borderWidth: 1.5,
                borderColor: theme.primary + "30",
              }}
            >
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={theme.primary}
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: theme.textLight,
              }}
            >
              Log Food
            </Text>
          </TouchableOpacity>

          {/* Action 2 */}
          <TouchableOpacity
            onPress={() => router.push("/(pages)/workoutSession")}
            activeOpacity={0.75}
            style={{ alignItems: "center", flex: 1 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "#3498db15",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 6,
                borderWidth: 1.5,
                borderColor: "#3498db30",
              }}
            >
              <MaterialCommunityIcons
                name="dumbbell"
                size={22}
                color="#3498db"
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: theme.textLight,
              }}
            >
              Workout
            </Text>
          </TouchableOpacity>

          {/* Action 3 */}
          <TouchableOpacity
            onPress={() => router.push("/nutritionProfile")}
            activeOpacity={0.75}
            style={{ alignItems: "center", flex: 1 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "#2ecc7115",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 6,
                borderWidth: 1.5,
                borderColor: "#2ecc7130",
              }}
            >
              <MaterialCommunityIcons name="target" size={22} color="#2ecc71" />
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: theme.textLight,
              }}
            >
              Goals
            </Text>
          </TouchableOpacity>

          {/* Action 4 */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/gymProgression")}
            activeOpacity={0.75}
            style={{ alignItems: "center", flex: 1 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "#e74c3c15",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 6,
                borderWidth: 1.5,
                borderColor: "#e74c3c30",
              }}
            >
              <MaterialCommunityIcons
                name="trending-up"
                size={22}
                color="#e74c3c"
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: theme.textLight,
              }}
            >
              Progress
            </Text>
          </TouchableOpacity>
        </FadeSlideIn>

        {!checking && hasActiveSession && storedSession && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.primary + "15",
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              gap: 10,
              borderWidth: 1.5,
              borderColor: theme.primary + "40",
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
              marginBottom: 8,
            }}
            onPress={() => router.push("/(pages)/activeWorkoutSession")}
            activeOpacity={0.75}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.primary,
                marginRight: 2,
              }}
            />
            <Text
              style={{
                flex: 1,
                color: theme.primary,
                fontSize: 14,
                fontWeight: "800",
                fontFamily: "PlusJakartaSans_800ExtraBold",
              }}
            >
              Active {displaySplit(storedSession.split)} Session
            </Text>
            <Text
              style={{
                color: theme.primary,
                fontSize: 13,
                fontWeight: "900",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                marginRight: 6,
              }}
            >
              Resume →
            </Text>
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={(e) => {
                e.stopPropagation();
                discard();
              }}
            >
              <MaterialIcons name="close" size={18} color={theme.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── Segmented Control Tabs ── */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginVertical: 12,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor:
                activeTab === "NUTRITION"
                  ? theme.primary + "15"
                  : "transparent",
              borderWidth: 1.5,
              borderColor:
                activeTab === "NUTRITION"
                  ? theme.primary + "30"
                  : "transparent",
            }}
            activeOpacity={0.8}
            onPress={() => setActiveTab("NUTRITION")}
          >
            <MaterialCommunityIcons
              name="food-apple"
              size={18}
              color={
                activeTab === "NUTRITION" ? theme.primary : theme.textLight
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color:
                  activeTab === "NUTRITION" ? theme.primary : theme.textLight,
              }}
            >
              Nutrition
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor:
                activeTab === "TRAINING" ? theme.primary + "15" : "transparent",
              borderWidth: 1.5,
              borderColor:
                activeTab === "TRAINING" ? theme.primary + "30" : "transparent",
            }}
            activeOpacity={0.8}
            onPress={() => setActiveTab("TRAINING")}
          >
            <MaterialCommunityIcons
              name="dumbbell"
              size={18}
              color={activeTab === "TRAINING" ? theme.primary : theme.textLight}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color:
                  activeTab === "TRAINING" ? theme.primary : theme.textLight,
              }}
            >
              Training
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "NUTRITION" && (
          <>
            <SectionLabel>Today&apos;s Fuel</SectionLabel>

            <FadeSlideIn delay={80}>
              <ShadowGlowCard style={homeCardStyle}>
                <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="fire"
                      size={20}
                      color={calorieColor}
                    />
                    <Text style={styles.sectionTitle}>Daily Progress</Text>
                  </View>
                  {summary && (
                    <View
                      style={{
                        backgroundColor:
                          statusColor(summary.status, theme) + "15",
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: statusColor(summary.status, theme) + "30",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: statusColor(summary.status, theme),
                        }}
                      >
                        {statusLabel(summary.status)}
                      </Text>
                    </View>
                  )}
                </View>

                {summaryLoading ? (
                  <NutritionSummarySkeleton />
                ) : prog ? (
                  <>
                    <MacroDonutChart
                      progress={prog}
                      theme={theme}
                      style={styles}
                    />
                    <TouchableOpacity
                      style={{
                        alignSelf: "center",
                        marginTop: 16,
                        backgroundColor: theme.primary + "10",
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.primary + "20",
                      }}
                      onPress={() => router.push("/foodDiary")}
                    >
                      <Text
                        style={{
                          color: theme.primary,
                          fontSize: 12,
                          fontWeight: "800",
                        }}
                      >
                        Open food diary →
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 20 }}>
                    <Text
                      style={[
                        styles.subEmptyText,
                        { textAlign: "center", marginBottom: 16 },
                      ]}
                    >
                      No food logged today. Start track your calories and
                      macros!
                    </Text>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => router.push("/foodDiary")}
                    >
                      <Text style={styles.primaryButtonText}>
                        Log your first meal
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ShadowGlowCard>
            </FadeSlideIn>
            <FadeSlideIn delay={120}>
              <WaterTracker />
            </FadeSlideIn>

            {profile && (
              <FadeSlideIn delay={100}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push("/nutritionProfile")}
                >
                  <ShadowGlowCard style={homeCardStyle}>
                    <View style={[styles.sectionHeader, { marginBottom: 14 }]}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MaterialIcons
                          name="person-outline"
                          size={18}
                          color={theme.primary}
                        />
                        <Text style={styles.sectionTitle}>Body Profile</Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: theme.primary + "15",
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: theme.primary + "30",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "800",
                            color: theme.primary,
                            textTransform: "uppercase",
                          }}
                        >
                          {profile.goal_type}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        backgroundColor: theme.primary + "06",
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1.5,
                        borderColor: theme.primary + "20",
                      }}
                    >
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: theme.textLight,
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          Weight
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "900",
                            color: theme.textBlack,
                          }}
                        >
                          {profile.weight_kg} kg
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 1,
                          backgroundColor: theme.border + "50",
                        }}
                      />
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: theme.textLight,
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          Height
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "900",
                            color: theme.textBlack,
                          }}
                        >
                          {profile.height_cm} cm
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 1,
                          backgroundColor: theme.border + "50",
                        }}
                      />
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: theme.textLight,
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          TDEE
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "900",
                            color: theme.textBlack,
                          }}
                        >
                          {profile.calculated_tdee?.toFixed(0)}
                        </Text>
                      </View>
                    </View>
                  </ShadowGlowCard>
                </TouchableOpacity>
              </FadeSlideIn>
            )}
            <View style={{ marginBottom: 20 }}></View>
          </>
        )}

        {activeTab === "TRAINING" && (
          <>
            <SectionLabel>Workout</SectionLabel>
            <FadeSlideIn delay={180}>
              <TouchableOpacity
                onPress={() => router.push("/(pages)/workoutSession")}
                activeOpacity={0.8}
                style={{ marginBottom: 12 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: theme.primary + "06",
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: theme.primary + "20",
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: theme.primary + "12",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="dumbbell"
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.textBlack,
                        fontSize: 15,
                        fontWeight: "800",
                      }}
                    >
                      Start a Workout
                    </Text>
                    <Text
                      style={{
                        color: theme.textLight,
                        fontSize: 12,
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      Pick exercises and begin your session
                    </Text>
                  </View>
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color={theme.primary}
                  />
                </View>
              </TouchableOpacity>
            </FadeSlideIn>

            <FadeSlideIn delay={120}>
              <ShadowGlowCard style={homeCardStyle}>
                <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MaterialIcons
                      name="calendar-today"
                      size={18}
                      color={theme.primary}
                    />
                    <Text style={styles.sectionTitle}>Weekly Streak</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor:
                        (workoutDaysThisWeek >= 4
                          ? theme.income
                          : theme.primary) + "15",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color:
                          workoutDaysThisWeek >= 4
                            ? theme.income
                            : theme.primary,
                      }}
                    >
                      {workoutDaysThisWeek} workout
                      {workoutDaysThisWeek !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <WeekStreak filledDays={streakDays} />
              </ShadowGlowCard>
            </FadeSlideIn>

            <FadeSlideIn delay={140}>
              <ShadowGlowCard style={homeCardStyle}>
                <View style={[styles.sectionHeader, { marginBottom: 14 }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="dumbbell"
                      size={18}
                      color={theme.primary}
                    />
                    <Text style={styles.sectionTitle}>Recent Progress</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: theme.primary + "15",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: theme.primary,
                      }}
                    >
                      {exercises.length} Tracked
                    </Text>
                  </View>
                </View>

                {gymLoading ? (
                  <RecentProgressSkeleton />
                ) : !dashboard && gymError ? (
                  <View style={{ alignItems: "center", paddingVertical: 16 }}>
                    <Text
                      style={[
                        styles.subEmptyText,
                        { textAlign: "center", marginBottom: 12 },
                      ]}
                    >
                      We couldn&apos;t load your training progress.
                    </Text>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => void refetchGym()}
                    >
                      <Text style={styles.primaryButtonText}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                ) : recentExercises.length ? (
                  <>
                    {recentExercises.map((exercise, idx) => {
                      const rm = getLatest1RM(exercise);
                      const lastDate = getLastSessionDate(exercise);
                      const trend = get1RMTrend(exercise);
                      return (
                        <View
                          key={exercise.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 12,
                            borderTopWidth: idx === 0 ? 0 : 1,
                            borderTopColor: theme.border + "30",
                            gap: 12,
                          }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: theme.primary + "10",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <MaterialCommunityIcons
                              name="arm-flex"
                              size={18}
                              color={theme.primary}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "800",
                                  color: theme.textBlack,
                                  textTransform: "capitalize",
                                }}
                              >
                                {exercise.name}
                              </Text>
                              {trend && (
                                <View
                                  style={{
                                    backgroundColor: trend.isPositive
                                      ? theme.income + "18"
                                      : theme.expense + "18",
                                    borderRadius: 6,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: "800",
                                      color: trend.isPositive
                                        ? theme.income
                                        : theme.expense,
                                    }}
                                  >
                                    {trend.isPositive ? "▲" : "▼"} {trend.value}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.listMeta}>
                              {displaySplit(exercise.split)} ·{" "}
                              {exercise.muscle_group ?? "-"} ·{" "}
                              {formatShortDate(lastDate)}
                            </Text>
                          </View>
                          {rm > 0 && (
                            <View style={{ alignItems: "flex-end" }}>
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontWeight: "900",
                                  color: theme.primary,
                                }}
                              >
                                {rm.toFixed(0)} kg
                              </Text>
                              <Text
                                style={{
                                  fontSize: 9,
                                  fontWeight: "600",
                                  color: theme.textLight,
                                }}
                              >
                                est. 1RM
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    <TouchableOpacity
                      style={{ alignSelf: "flex-end", marginTop: 8 }}
                      onPress={() => router.push("/(tabs)/gymProgression")}
                    >
                      <Text style={styles.inlineActionText}>View all →</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 16 }}>
                    <Text
                      style={[
                        styles.subEmptyText,
                        { textAlign: "center", marginBottom: 12 },
                      ]}
                    >
                      No exercises tracked yet. Start recording your lifts!
                    </Text>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => router.push("/(tabs)/gymProgression")}
                    >
                      <Text style={styles.primaryButtonText}>
                        Add first exercise
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ShadowGlowCard>
            </FadeSlideIn>

            {/* Split overview */}
            {exercises.length > 0 && (
              <FadeSlideIn delay={160}>
                <SplitSummaryCard exercises={exercises} styles={styles} />
              </FadeSlideIn>
            )}
            <View style={{ marginBottom: 20 }}></View>
          </>
        )}
      </TabScreenScrollView>
    </SafeAreaView>
  );
}
