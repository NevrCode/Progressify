import { FadeSlideIn } from "@/components/animations/fade-slide-in";
import { AppButton } from "@/components/base/app-button";
import { PageHeader } from "@/components/base/page-header";
import { SectionLabel } from "@/components/base/SectionLabel";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ShimmerSkeleton } from "@/components/base/shimmer-skeleton";
import { StatePanel } from "@/components/base/state-panel";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { InsightCard } from "@/components/home/insight-card";
import { OnboardingChecklist } from "@/components/home/onboarding-checklist";
import { WeeklyReviewCard } from "@/components/home/weekly-review-card";
import { getNutritionAccents } from "@/constants/semantic-colors";
import { useTheme } from "@/context/ThemeContext";
import { useActiveSession } from "@/hooks/useActiveSession";
import { FOOD_DIARY_QUERY_KEY } from "@/hooks/useFoodDiary";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import { useOnboardingPreference } from "@/hooks/useOnboardingPreference";
import {
  NUTRITION_PROFILE_KEY,
  useTodayDiarySummary,
} from "@/hooks/useNutrition";
import { useProfile } from "@/hooks/useProfile";
import type {
  ExerciseProgressionDTO,
  ExerciseSessionDTO,
} from "@/services/gymService";
import { getFoodEntries } from "@/services/foodDiaryService";
import { getUserProfile } from "@/services/nutritionService";
import { getWaterIntake, logWaterIntake } from "@/services/waterService";
import {
  getWorkoutPrograms,
  type WorkoutProgramDTO,
} from "@/services/workoutProgramService";
import {
  buildNutritionInsights,
  buildTrainingInsights,
} from "@/utils/home-insights";
import {
  buildWeeklyReview,
  hasCompleteWeeklyFoodHistory,
} from "@/utils/weekly-review";
import {
  buildOnboardingSteps,
  getOnboardingProgress,
  type OnboardingStep,
} from "@/utils/onboarding";
import { toApiError } from "@/utils/apiError";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDateForApi = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const today = new Date();
const todayKey = formatDateForApi(today);
const WATER_GOAL_ML = 2000;
const HOME_FOOD_HISTORY_LIMIT = 100;

const getSessionTime = (session: ExerciseSessionDTO) => {
  const value = session.session_date
    ? new Date(session.session_date).getTime()
    : 0;
  return Number.isFinite(value) ? value : 0;
};

const getLatestSession = (exercise: ExerciseProgressionDTO) =>
  [...(exercise.exercise_sessions ?? [])].sort(
    (left, right) => getSessionTime(right) - getSessionTime(left),
  )[0];

const estimate1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

const getLatestEstimated1RM = (exercise: ExerciseProgressionDTO) => {
  const sets = getLatestSession(exercise)?.sets ?? [];
  return sets.length
    ? Math.max(...sets.map((set) => estimate1RM(set.weight, set.reps)))
    : 0;
};

const formatCompactNumber = (value: number, suffix = "") =>
  `${Math.round(value).toLocaleString()}${suffix}`;

const clampPercentage = (value?: number) =>
  Math.max(0, Math.min(value ?? 0, 100));

type MetricProps = {
  label: string;
  value: string;
  supporting: string;
  percentage: number;
  accentColor: string;
};

function TodayMetric({
  label,
  value,
  supporting,
  percentage,
  accentColor,
}: MetricProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: accentColor + "0D",
          borderColor: accentColor + "24",
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: accentColor }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricSupporting, { color: theme.textLight }]}>
        {supporting}
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: accentColor,
              width: `${clampPercentage(percentage)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function HomeSummarySkeleton() {
  return (
    <View
      style={styles.metricGrid}
      accessibilityLabel="Loading today's summary"
    >
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.metric}>
          <ShimmerSkeleton width={60} height={9} />
          <ShimmerSkeleton width={72} height={20} />
          <ShimmerSkeleton width={56} height={9} />
          <ShimmerSkeleton height={5} borderRadius={3} />
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const nutritionAccents = getNutritionAccents(theme.background);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [primaryInsightExplanationVisible, setPrimaryInsightExplanationVisible] =
    useState(false);
  const [onboardingPreference, setOnboardingPreference] =
    useOnboardingPreference();
  const onboardingEnabled = onboardingPreference !== "dismissed";
  const profileQuery = useProfile();
  const nutritionQuery = useTodayDiarySummary(todayKey);
  const gymQuery = useGymDashboard();
  const programsQuery = useQuery({
    queryKey: ["gym", "programs"],
    queryFn: getWorkoutPrograms,
  });
  const waterQuery = useQuery({
    queryKey: ["water-intake", todayKey],
    queryFn: () => getWaterIntake(todayKey),
  });
  const nutritionProfileSetupQuery = useQuery({
    queryKey: NUTRITION_PROFILE_KEY,
    queryFn: getUserProfile,
    retry: false,
    enabled: onboardingEnabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const foodHistoryQuery = useQuery({
    queryKey: [
      ...FOOD_DIARY_QUERY_KEY,
      "home-history",
      HOME_FOOD_HISTORY_LIMIT,
    ],
    queryFn: () =>
      getFoodEntries({
        limit: HOME_FOOD_HISTORY_LIMIT,
        sortBy: "date",
        direction: "desc",
      }),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const waterMutation = useMutation({
    mutationFn: (increment: number) => logWaterIntake(todayKey, increment),
    onSuccess: (amount) => {
      queryClient.setQueryData(["water-intake", todayKey], amount);
    },
  });
  const {
    storedSession,
    hasActiveSession,
    checking: activeSessionLoading,
    refresh: refreshActiveSession,
  } = useActiveSession();

  const activeProgram = useMemo(
    () =>
      (programsQuery.data ?? []).find(
        (program: WorkoutProgramDTO) => program.status === "ACTIVE",
      ),
    [programsQuery.data],
  );
  const exercises = useMemo(
    () => gymQuery.data?.exercise_progressions ?? [],
    [gymQuery.data],
  );
  const onboardingSteps = useMemo(
    () =>
      buildOnboardingSteps({
        hasNutritionProfile: !!nutritionProfileSetupQuery.data,
        hasActiveProgram: !!activeProgram,
        hasExercise: exercises.length > 0,
        hasCompletedWorkout: exercises.some(
          (exercise) => (exercise.exercise_sessions?.length ?? 0) > 0,
        ),
        hasFoodEntry:
          (foodHistoryQuery.data?.total_elements ??
            foodHistoryQuery.data?.totalElements ??
            foodHistoryQuery.data?.content?.length ??
            foodHistoryQuery.data?.data?.length ??
            0) > 0,
      }),
    [
      activeProgram,
      exercises,
      foodHistoryQuery.data,
      nutritionProfileSetupQuery.data,
    ],
  );
  const onboardingProgress = useMemo(
    () => getOnboardingProgress(onboardingSteps),
    [onboardingSteps],
  );
  const reviewingOnboarding = onboardingPreference === "review";
  const showOnboarding =
    onboardingPreference !== "dismissed" &&
    (reviewingOnboarding || !onboardingProgress.allComplete);
  const onboardingLoading =
    nutritionProfileSetupQuery.isLoading ||
    foodHistoryQuery.isLoading ||
    gymQuery.isLoading ||
    programsQuery.isLoading;
  const onboardingUnavailable =
    (nutritionProfileSetupQuery.isError &&
      toApiError(nutritionProfileSetupQuery.error).status !== 404) ||
    foodHistoryQuery.isError ||
    gymQuery.isError ||
    programsQuery.isError;
  const retryOnboarding = () => {
    nutritionProfileSetupQuery.refetch();
    foodHistoryQuery.refetch();
    gymQuery.refetch();
    programsQuery.refetch();
  };

  const sessionDatesThisWeek = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const dates = new Set<string>();

    for (const exercise of exercises) {
      for (const session of exercise.exercise_sessions ?? []) {
        if (!session.session_date) continue;
        const time = new Date(session.session_date).getTime();
        if (
          Number.isFinite(time) &&
          time >= start.getTime() &&
          time <= today.getTime()
        ) {
          dates.add(session.session_date.slice(0, 10));
        }
      }
    }
    return dates;
  }, [exercises]);

  const recentTraining = useMemo(
    () =>
      exercises
        .map((exercise) => ({
          exercise,
          session: getLatestSession(exercise),
        }))
        .filter((item) => item.session)
        .sort(
          (left, right) =>
            getSessionTime(right.session!) - getSessionTime(left.session!),
        )
        .slice(0, 2),
    [exercises],
  );

  const nutrition = nutritionQuery.data?.progress;
  const foodEntries = useMemo(
    () =>
      foodHistoryQuery.data?.content ?? foodHistoryQuery.data?.data ?? [],
    [foodHistoryQuery.data],
  );
  const trainingInsights = useMemo(
    () => buildTrainingInsights(exercises, today),
    [exercises],
  );
  const nutritionInsights = useMemo(
    () => buildNutritionInsights(nutrition, foodEntries, today),
    [foodEntries, nutrition],
  );
  const foodHistoryTotal =
    foodHistoryQuery.data?.total_elements ??
    foodHistoryQuery.data?.totalElements ??
    foodEntries.length;
  const foodHistoryComplete = useMemo(
    () =>
      hasCompleteWeeklyFoodHistory(
        foodEntries,
        foodHistoryTotal,
        today,
      ),
    [foodEntries, foodHistoryTotal],
  );
  const weeklyReview = useMemo(
    () =>
      buildWeeklyReview(exercises, foodEntries, {
        referenceDate: today,
        foodHistoryComplete,
      }),
    [exercises, foodEntries, foodHistoryComplete],
  );
  const primaryTrainingInsight = trainingInsights[0];
  const additionalInsights = useMemo(
    () =>
      [
        ...trainingInsights.slice(1, 3),
        ...nutritionInsights.slice(0, 1),
      ].slice(0, 3),
    [nutritionInsights, trainingInsights],
  );
  const waterAmount = waterQuery.data ?? 0;
  const isSummaryLoading =
    nutritionQuery.isLoading || gymQuery.isLoading || waterQuery.isLoading;
  const isRefreshing =
    nutritionQuery.isFetching ||
    gymQuery.isFetching ||
    programsQuery.isFetching ||
    foodHistoryQuery.isFetching ||
    profileQuery.isFetching ||
    waterQuery.isFetching ||
    activeSessionLoading;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const period =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    return profileQuery.data?.name
      ? `${period}, ${profileQuery.data.name}`
      : period;
  }, [profileQuery.data?.name]);

  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const refresh = () => {
    nutritionQuery.refetch();
    gymQuery.refetch();
    programsQuery.refetch();
    foodHistoryQuery.refetch();
    profileQuery.refetch();
    waterQuery.refetch();
    refreshActiveSession();
  };

  const openWorkout = () => {
    if (hasActiveSession && storedSession) {
      router.push("/activeWorkoutSession");
      return;
    }
    if (activeProgram) {
      router.push("/programs");
      return;
    }
    router.push("/workoutSession");
  };
  const openOnboardingStep = (step: OnboardingStep) => {
    if (step.key === "nutrition-profile" || step.key === "first-food") {
      router.push("/foodDiary");
      return;
    }
    if (step.key === "first-exercise") {
      router.push("/gymProgression");
      return;
    }
    router.push("/programs");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <TabScreenScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={theme.primary}
          />
        }
      >
        <FadeSlideIn>
          <PageHeader
            eyebrow={greeting}
            title={dateLabel}
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

        {showOnboarding ? (
          <FadeSlideIn delay={20}>
            <OnboardingChecklist
              steps={onboardingSteps}
              loading={onboardingLoading}
              collapsed={onboardingPreference === "collapsed"}
              reviewMode={reviewingOnboarding}
              unavailable={onboardingUnavailable}
              onStepPress={openOnboardingStep}
              onRetry={retryOnboarding}
              onCollapse={() => setOnboardingPreference("collapsed")}
              onExpand={() => setOnboardingPreference("auto")}
              onDismiss={() => setOnboardingPreference("dismissed")}
            />
          </FadeSlideIn>
        ) : null}

        <FadeSlideIn delay={40}>
          <ShadowGlowCard
            glowColor={hasActiveSession ? theme.primary : undefined}
            style={styles.heroCard}
          >
            <View style={styles.heroHeading}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.eyebrow, { color: theme.primary }]}>
                  {hasActiveSession
                    ? "Workout in progress"
                    : activeProgram
                      ? "Active program"
                      : "Ready when you are"}
                </Text>
                <Text style={[styles.heroTitle, { color: theme.text }]}>
                  {hasActiveSession && storedSession
                    ? (storedSession.routineName ?? "Manual Workout")
                    : (activeProgram?.name ?? "Start today’s workout")}
                </Text>
                <Text style={[styles.heroMeta, { color: theme.textLight }]}>
                  {hasActiveSession && storedSession
                    ? `${storedSession.exerciseIds.length} exercises selected`
                    : activeProgram
                      ? `${activeProgram.routines.length} routines · choose the one you are training today`
                      : "Start manually or create a reusable workout program"}
                </Text>
              </View>
              {hasActiveSession && (
                <MaterialCommunityIcons
                  name={"progress-clock"}
                  size={28}
                  color={theme.primary}
                />
              )}
            </View>
            <AppButton
              label={
                hasActiveSession
                  ? "Resume workout"
                  : activeProgram
                    ? "Choose routine"
                    : "Start workout"
              }
              onPress={openWorkout}
            />
          </ShadowGlowCard>
        </FadeSlideIn>

        <SectionLabel>Today</SectionLabel>
        <FadeSlideIn delay={80}>
          <ShadowGlowCard>
            {isSummaryLoading ? (
              <HomeSummarySkeleton />
            ) : (
              <View style={styles.metricGrid}>
                <TodayMetric
                  accentColor={nutritionAccents.calories}
                  label="Calories"
                  value={formatCompactNumber(nutrition?.calories.consumed ?? 0)}
                  supporting={`of ${formatCompactNumber(nutrition?.calories.goal ?? 0)}`}
                  percentage={nutrition?.calories.percentage ?? 0}
                />
                <TodayMetric
                  accentColor={nutritionAccents.protein}
                  label="Protein"
                  value={formatCompactNumber(
                    nutrition?.protein.consumed ?? 0,
                    "g",
                  )}
                  supporting={`of ${formatCompactNumber(nutrition?.protein.goal ?? 0, "g")}`}
                  percentage={nutrition?.protein.percentage ?? 0}
                />
                <TodayMetric
                  accentColor={nutritionAccents.water}
                  label="Water"
                  value={
                    waterAmount >= 1000
                      ? `${(waterAmount / 1000).toFixed(1)}L`
                      : `${waterAmount}ml`
                  }
                  supporting={`of ${WATER_GOAL_ML / 1000}L`}
                  percentage={(waterAmount / WATER_GOAL_ML) * 100}
                />
                <TodayMetric
                  accentColor={theme.primary}
                  label="Training"
                  value={hasActiveSession ? "Active" : "Not started"}
                  supporting={
                    activeProgram
                      ? activeProgram.name
                      : `${sessionDatesThisWeek.size} days this week`
                  }
                  percentage={(sessionDatesThisWeek.size / 7) * 100}
                />
              </View>
            )}

            <View
              style={[styles.waterControls, { borderTopColor: theme.border }]}
            >
              <View style={styles.waterControlLabel}>
                <MaterialCommunityIcons
                  name="water"
                  size={17}
                  color={nutritionAccents.water}
                />
                <Text style={[styles.waterControlText, { color: theme.text }]}>
                  Log water
                </Text>
              </View>
              <View style={styles.waterButtons}>
                {[
                  { label: "−250", increment: -250 },
                  { label: "+250", increment: 250 },
                  { label: "+500", increment: 500 },
                ].map((action) => {
                  const disabled =
                    waterMutation.isPending ||
                    (action.increment < 0 && waterAmount <= 0);
                  return (
                    <TouchableOpacity
                      accessibilityLabel={`${action.label} milliliters of water`}
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: waterMutation.isPending,
                        disabled,
                      }}
                      activeOpacity={0.7}
                      disabled={disabled}
                      key={action.label}
                      onPress={() => waterMutation.mutate(action.increment)}
                      style={[
                        styles.waterButton,
                        {
                          backgroundColor: nutritionAccents.water + "10",
                          borderColor: nutritionAccents.water + "30",
                          opacity: disabled ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.waterButtonText,
                          { color: nutritionAccents.water },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              style={[styles.summaryActions, { borderTopColor: theme.border }]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Log food"
                hitSlop={8}
                onPress={() => router.push("/foodDiary")}
              >
                <Text style={[styles.inlineAction, { color: theme.primary }]}>
                  Log food
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open nutrition goals"
                hitSlop={8}
                onPress={() => router.push("/nutritionProfile")}
              >
                <Text style={[styles.inlineAction, { color: theme.primary }]}>
                  Nutrition goals
                </Text>
              </TouchableOpacity>
            </View>
          </ShadowGlowCard>
        </FadeSlideIn>

        <SectionLabel>This week</SectionLabel>
        <FadeSlideIn delay={120}>
          <ShadowGlowCard>
            <View style={styles.weekRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weekValue, { color: theme.text }]}>
                  {sessionDatesThisWeek.size}
                </Text>
                <Text style={[styles.weekLabel, { color: theme.textLight }]}>
                  training days
                </Text>
              </View>
              <View
                style={[styles.weekDivider, { backgroundColor: theme.border }]}
              />
              <View style={{ flex: 2 }}>
                <Text style={[styles.insightLabel, { color: theme.textLight }]}>
                  Current insight
                </Text>
                <Text
                  selectable
                  style={[styles.insightText, { color: theme.text }]}
                >
                  {primaryTrainingInsight
                    ? primaryTrainingInsight.message
                    : sessionDatesThisWeek.size > 0
                      ? "Training is recorded this week. Another completed session will make trends more useful."
                      : "No completed training has been recorded in the last seven days."}
                </Text>
                {primaryTrainingInsight ? (
                  <>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${
                        primaryInsightExplanationVisible ? "Hide" : "Show"
                      } current insight explanation`}
                      accessibilityState={{
                        expanded: primaryInsightExplanationVisible,
                      }}
                      hitSlop={8}
                      onPress={() =>
                        setPrimaryInsightExplanationVisible(
                          (visible) => !visible,
                        )
                      }
                      style={styles.currentInsightExplanationButton}
                    >
                      <Text
                        style={[
                          styles.currentInsightExplanationLabel,
                          { color: theme.primary },
                        ]}
                      >
                        {primaryInsightExplanationVisible
                          ? "Hide explanation"
                          : "Why am I seeing this?"}
                      </Text>
                      <MaterialCommunityIcons
                        name={
                          primaryInsightExplanationVisible
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={17}
                        color={theme.primary}
                      />
                    </TouchableOpacity>
                    {primaryInsightExplanationVisible ? (
                      <Text
                        selectable
                        accessibilityLiveRegion="polite"
                        style={[
                          styles.currentInsightReason,
                          {
                            color: theme.textLight,
                            borderTopColor: theme.border,
                          },
                        ]}
                      >
                        {primaryTrainingInsight.reason}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            </View>
          </ShadowGlowCard>
        </FadeSlideIn>

        {additionalInsights.length > 0 ? (
          <>
            <SectionLabel>More insights</SectionLabel>
            <View style={styles.insightList}>
              {additionalInsights.map((insight, index) => (
                <FadeSlideIn key={insight.id} delay={140 + index * 20}>
                  <InsightCard
                    insight={insight}
                    onPress={() =>
                      router.push(
                        insight.destination === "gym"
                          ? "/gymProgression"
                          : "/foodDiary",
                      )
                    }
                  />
                </FadeSlideIn>
              ))}
            </View>
          </>
        ) : null}

        <SectionLabel>Review</SectionLabel>
        <FadeSlideIn delay={200}>
          <WeeklyReviewCard
            review={weeklyReview}
            nutritionHistoryLoading={foodHistoryQuery.isLoading}
          />
        </FadeSlideIn>

        <View style={styles.sectionHeading}>
          <SectionLabel>Recent activity</SectionLabel>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View all recent training activity"
            hitSlop={8}
            onPress={() => router.push("/gymProgression")}
          >
            <Text style={[styles.inlineAction, { color: theme.primary }]}>
              View all
            </Text>
          </TouchableOpacity>
        </View>
        <FadeSlideIn delay={160}>
          <ShadowGlowCard>
            {gymQuery.isLoading ? (
              <View style={{ gap: 16 }}>
                {[0, 1].map((item) => (
                  <View key={item} style={styles.activityRow}>
                    <ShimmerSkeleton width={38} height={38} borderRadius={12} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <ShimmerSkeleton width="65%" height={12} />
                      <ShimmerSkeleton width="45%" height={9} />
                    </View>
                  </View>
                ))}
              </View>
            ) : recentTraining.length > 0 ? (
              recentTraining.map(({ exercise, session }, index) => (
                <View
                  key={`${exercise.id}-${session!.id}`}
                  style={[
                    styles.activityRow,
                    index > 0 && {
                      borderTopColor: theme.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      paddingTop: 14,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.activityTitle, { color: theme.text }]}>
                      {exercise.name ?? "Exercise"}
                    </Text>
                    <Text
                      style={[styles.activityMeta, { color: theme.textLight }]}
                    >
                      {session!.sets?.length ?? 0} sets ·{" "}
                      {session!.session_date?.slice(0, 10) ?? "Unknown date"}
                    </Text>
                  </View>
                  {getLatestEstimated1RM(exercise) > 0 ? (
                    <Text
                      style={[styles.activityValue, { color: theme.primary }]}
                    >
                      {getLatestEstimated1RM(exercise).toFixed(0)} kg
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <StatePanel
                variant="empty"
                compact
                embedded
                title="No training activity yet"
                message="Completed exercise sessions will appear here."
                primaryAction={{
                  label: "Start workout",
                  onPress: openWorkout,
                }}
              />
            )}
          </ShadowGlowCard>
        </FadeSlideIn>

        {(nutritionQuery.isError ||
          gymQuery.isError ||
          programsQuery.isError) && (
          <StatePanel
            variant="error"
            compact
            title="Dashboard refresh incomplete"
            message="Some information could not be refreshed. Cached data is still shown where available."
            primaryAction={{
              label: "Retry",
              onPress: refresh,
              accessibilityHint: "Retries loading all dashboard information",
            }}
          />
        )}
      </TabScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroCard: { gap: 16 },
  heroHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  eyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 20,
  },
  heroMeta: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    lineHeight: 17,
  },
  metricGrid: {
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  metric: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 10,
    width: "48.5%",
  },
  metricLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  metricValue: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 19,
    fontVariant: ["tabular-nums"],
  },
  metricSupporting: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  progressTrack: {
    borderRadius: 3,
    height: 5,
    marginTop: 3,
    overflow: "hidden",
  },
  progressFill: { borderRadius: 3, height: "100%" },
  summaryActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 20,
    marginTop: 18,
    paddingHorizontal: 6,
    paddingTop: 14,
  },
  waterControls: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 18,
    paddingHorizontal: 6,
    paddingTop: 14,
  },
  waterControlLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  waterControlText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
  waterButtons: {
    flexDirection: "row",
    gap: 6,
  },
  waterButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 48,
    paddingHorizontal: 8,
  },
  waterButtonText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  inlineAction: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
  weekRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  weekValue: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  weekLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
  },
  weekDivider: { height: 48, width: StyleSheet.hairlineWidth },
  insightLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  insightText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  currentInsightExplanationButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 2,
    minHeight: 44,
  },
  currentInsightExplanationLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
  },
  currentInsightReason: {
    borderTopWidth: StyleSheet.hairlineWidth,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    lineHeight: 15,
    paddingTop: 8,
  },
  insightList: {
    gap: 10,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 5,
  },
  activityIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  activityTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  activityMeta: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  activityValue: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});
