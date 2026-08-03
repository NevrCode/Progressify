import { gymStyles } from "@/assets/styles/gym.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { SegmentedControl } from "@/components/base/segmented-control";
import { SelectionCard } from "@/components/base/selection-card";
import { StatePanel } from "@/components/base/state-panel";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { FoodDiaryEntriesSection } from "@/components/nutrition/food-diary-entries-section";
import { FoodLoggingFlow } from "@/components/nutrition/food-logging-flow";
import { FoodDiaryPageHeader } from "@/components/nutrition/food-diary-page-header";
import {
  FoodDiaryInitialSkeleton,
  IntakeSummarySkeleton,
} from "@/components/nutrition/food-diary-skeletons";
import { MealPrepSection } from "@/components/nutrition/mealPrepSection";
import { NutritionProfileOverview } from "@/components/nutrition/nutrition-profile-overview";
import { ThemeType } from "@/constants/colors";
import {
  getNutritionAccents,
  getThemeSemantics,
} from "@/constants/semantic-colors";
import { useAlert } from "@/context/AlertContext";
import { useDiaryContext } from "@/context/DairyContext";
import { useTheme } from "@/context/ThemeContext";
import {
  FOOD_DIARY_QUERY_KEY,
  useFoodDiarySummary,
  useFoodEntries,
} from "@/hooks/useFoodDiary";
import {
  useNutritionGoals,
  useNutritionProfile,
  useOverrideGoals,
  useSaveNutritionProfile,
  useTodayDiarySummary,
} from "@/hooks/useNutrition";
import {
  deleteFoodEntry,
  FoodEntryDetailResponseDTO,
} from "@/services/foodDiaryService";
import {
  ActivityLevel,
  Gender,
  GoalType,
  MacroProgress,
} from "@/services/nutritionService";
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FoodFeedbackSurface =
  | "page"
  | "profile"
  | "override"
  | "single"
  | "custom";

type ScopedFoodActionFeedback = ActionFeedback & {
  surface: FoodFeedbackSurface;
};

const genderOptions: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const activityOptions: { value: ActivityLevel; label: string; desc: string }[] =
  [
    { value: "SEDENTARY", label: "Sedentary", desc: "Little or no exercise" },
    { value: "LIGHTLY_ACTIVE", label: "Lightly Active", desc: "1–3 days/week" },
    {
      value: "MODERATELY_ACTIVE",
      label: "Moderately Active",
      desc: "3–5 days/week",
    },
    { value: "VERY_ACTIVE", label: "Very Active", desc: "6–7 days/week" },
    {
      value: "EXTRA_ACTIVE",
      label: "Extra Active",
      desc: "Athlete / physical job",
    },
  ];

const goalOptions: {
  value: GoalType;
  label: string;
  desc: string;
}[] = [
  { value: "CUT", label: "Cut", desc: "Lose fat (−500 kcal)" },
  { value: "MAINTAIN", label: "Maintain", desc: "Stay the same" },
  {
    value: "BULK",
    label: "Bulk",
    desc: "Build muscle (+300 kcal)",
  },
];

const getEntryValue = (
  entry: FoodEntryDetailResponseDTO,
  snakeKey: string,
  camelKey?: string,
) => {
  const source = entry as Record<string, unknown>;
  return source[snakeKey] ?? (camelKey ? source[camelKey] : undefined);
};

const getEntryFoodName = (entry: FoodEntryDetailResponseDTO) =>
  String(getEntryValue(entry, "food_name", "foodName") ?? "Food");

const statusColor = (status: string | undefined, theme: ThemeType) => {
  const semantics = getThemeSemantics(theme);
  if (status === "ON_TRACK") return semantics.success;
  if (status === "OVER") return semantics.danger;
  return theme.textLight;
};

export function MacroBar({
  label,
  unit,
  progress,
  color,
  theme,
  style,
}: {
  label: string;
  unit: string;
  progress: MacroProgress;
  color: string;
  theme: ThemeType;
  style: any;
}) {
  const percentage = Math.min(progress.percentage, 100);
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text style={[style.listMeta, { color, fontWeight: "700" }]}>
          {label}
        </Text>
        <Text style={style.listMeta}>
          {progress.consumed.toFixed(1)}
          {unit} / {progress.goal.toFixed(0)}
          {unit}
          {"  "}
          <Text style={{ color }}>{progress.percentage.toFixed(0)}%</Text>
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
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </View>
      <Text
        style={[
          style.listMeta,
          { textAlign: "right", marginTop: 2, fontSize: 11 },
        ]}
      >
        {progress.remaining.toFixed(1)}
        {unit} remaining
      </Text>
    </View>
  );
}

// ── MacroBar component ────────────────────────────────────────────────────────
export default function FoodDiary() {
  const { theme } = useTheme();
  const nutritionAccents = getNutritionAccents(theme.background);
  const semantics = getThemeSemantics(theme);
  const styles = gymStyles(theme);
  const { alert } = useAlert();
  const { selectedDate, setSelectedDate } = useDiaryContext();
  const [activeTab, setActiveTab] = useState<"SINGLE" | "PREP">("SINGLE");
  const { data: profile, isLoading: profileLoading } = useNutritionProfile();
  const { data: goals } = useNutritionGoals();
  const {
    data: todayDairySummary,
    isLoading: summaryDiaryLoading,
    refetch: refetchTodayDiarySummary,
  } = useTodayDiarySummary(selectedDate);

  const saveMutation = useSaveNutritionProfile();
  const overrideMutation = useOverrideGoals();

  // ── Onboarding / edit form state ──────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [step, setStep] = useState(0); // 0=body, 1=activity, 2=goal

  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? "");
  const [height, setHeight] = useState(profile?.height_cm?.toString() ?? "");
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [gender, setGender] = useState<Gender>(profile?.gender ?? "MALE");
  const [activity, setActivity] = useState<ActivityLevel>(
    profile?.activity_level ?? "MODERATELY_ACTIVE",
  );
  const [goal, setGoal] = useState<GoalType>(profile?.goal_type ?? "MAINTAIN");

  // ── Override form state ───────────────────────────────────────────────────
  const [oCalories, setOCalories] = useState(
    goals?.calories_goal?.toString() ?? "",
  );
  const [oProtein, setOProtein] = useState(
    goals?.protein_goal?.toString() ?? "",
  );
  const [oCarbs, setOCarbs] = useState(goals?.carbs_goal?.toString() ?? "");
  const [oFat, setOFat] = useState(goals?.fat_goal?.toString() ?? "");
  const [oFiber, setOFiber] = useState(goals?.fiber_goal?.toString() ?? "");
  const [oSodium, setOSodium] = useState(goals?.sodium_goal?.toString() ?? "");
  const [oSugar, setOSugar] = useState(goals?.sugar_goal?.toString() ?? "");
  const [oCholesterol, setOCholesterol] = useState(
    goals?.cholesterol_goal?.toString() ?? "",
  );
  const [oPotassium, setOPotassium] = useState(
    goals?.potassium_goal?.toString() ?? "",
  );
  const hasProfile = !!profile;

  const openForm = () => {
    setFoodActionFeedback(null);
    setWeight(profile?.weight_kg?.toString() ?? "");
    setHeight(profile?.height_cm?.toString() ?? "");
    setAge(profile?.age?.toString() ?? "");
    setGender(profile?.gender ?? "MALE");
    setActivity(profile?.activity_level ?? "MODERATELY_ACTIVE");
    setGoal(profile?.goal_type ?? "MAINTAIN");
    setStep(0);
    setFormOpen(true);
  };

  const openOverride = () => {
    setFoodActionFeedback(null);
    setOCalories(goals?.calories_goal?.toString() ?? "");
    setOProtein(goals?.protein_goal?.toString() ?? "");
    setOCarbs(goals?.carbs_goal?.toString() ?? "");
    setOFat(goals?.fat_goal?.toString() ?? "");
    setOFiber(goals?.fiber_goal?.toString() ?? "");
    setOSodium(goals?.sodium_goal?.toString() ?? "");
    setOSugar(goals?.sugar_goal?.toString() ?? "");
    setOCholesterol(goals?.cholesterol_goal?.toString() ?? "");
    setOPotassium(goals?.potassium_goal?.toString() ?? "");
    setOverrideOpen(true);
  };

  const saveProfile = () => {
    const w = parseFloat(weight),
      h = parseFloat(height),
      a = parseInt(age);
    if (!w || !h || !a) {
      setFoodActionFeedback({
        surface: "profile",
        status: "error",
        title: "Missing information",
        message: "Fill in weight, height, and age.",
      });
      return;
    }
    setFoodActionFeedback(null);
    saveMutation.mutate(
      {
        weight_kg: w,
        height_cm: h,
        age: a,
        gender,
        activity_level: activity,
        goal_type: goal,
      },
      {
        onSuccess: (res) => {
          if (isOfflineQueuedResponse(res)) {
            setFoodActionFeedback({
              surface: "profile",
              status: "info",
              title: "Profile saved locally",
              message:
                "Keep this form available while the profile waits to synchronize.",
            });
            return;
          }
          setFormOpen(false);
          setFoodActionFeedback({
            surface: "page",
            status: "success",
            title: "Nutrition profile saved",
            message: `Daily goal ${res.calculated_calories.toFixed(0)} kcal · TDEE ${res.calculated_tdee.toFixed(0)} kcal.`,
          });
        },
        onError: (error) =>
          setFoodActionFeedback({
            surface: "profile",
            status: "error",
            title: "Could not save profile",
            message: toApiError(error).message,
          }),
      },
    );
  };

  const saveOverride = () => {
    const c = parseFloat(oCalories),
      p = parseFloat(oProtein),
      cb = parseFloat(oCarbs),
      f = parseFloat(oFat);
    if (!c || !p || !cb || !f) {
      setFoodActionFeedback({
        surface: "override",
        status: "error",
        title: "Goals required",
        message: "Calories, protein, carbs and fat are required.",
      });
      return;
    }
    setFoodActionFeedback(null);
    overrideMutation.mutate(
      {
        calories_goal: c,
        protein_goal: p,
        carbs_goal: cb,
        fat_goal: f,
        fiber_goal: oFiber ? parseFloat(oFiber) : undefined,
        sodium_goal: oSodium ? parseFloat(oSodium) : undefined,
        sugar_goal: oSugar ? parseFloat(oSugar) : undefined,
        cholesterol_goal: oCholesterol ? parseFloat(oCholesterol) : undefined,
        potassium_goal: oPotassium ? parseFloat(oPotassium) : undefined,
      },
      {
        onSuccess: (result) => {
          if (isOfflineQueuedResponse(result)) {
            setFoodActionFeedback({
              surface: "override",
              status: "info",
              title: "Goals saved locally",
              message:
                "Keep this form available while the goal changes wait to synchronize.",
            });
            return;
          }
          setOverrideOpen(false);
          setFoodActionFeedback({
            surface: "page",
            status: "success",
            title: "Nutrition goals updated",
            message: "Your daily calorie and macro targets are now active.",
          });
        },
        onError: (error) =>
          setFoodActionFeedback({
            surface: "override",
            status: "error",
            title: "Could not update goals",
            message: toApiError(error).message,
          }),
      },
    );
  };
  const queryClient = useQueryClient();
  const [openMoreMacros, setOpenMoreMacros] = useState(false);
  const [foodLoggingOpenRequest, setFoodLoggingOpenRequest] = useState(0);
  const [foodActionFeedback, setFoodActionFeedback] =
    useState<ScopedFoodActionFeedback | null>(null);
  const {
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useFoodDiarySummary(selectedDate);
  const {
    isLoading: entriesLoading,
    isFetching: entriesFetching,
    refetch: refetchEntries,
  } = useFoodEntries();

  const deleteEntryMutation = useMutation({
    mutationFn: deleteFoodEntry,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "summary", selectedDate],
      });
      await queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["diary-summary", selectedDate],
      });
      const queued = isOfflineQueuedResponse(result);
      setFoodActionFeedback({
        surface: "page",
        status: queued ? "info" : "success",
        title: queued ? "Deletion saved locally" : "Food entry deleted",
        message: queued
          ? "The diary entry will be removed after synchronization."
          : "The food entry was removed from the diary.",
      });
    },
    onError: (error) => {
      setFoodActionFeedback({
        surface: "page",
        status: "error",
        title: "Could not delete food",
        message: toApiError(error).message,
      });
    },
  });

  const isRefreshing =
    !summaryLoading && !entriesLoading && (summaryFetching || entriesFetching);

  const refreshDiary = () => {
    refetchSummary();
    refetchEntries();
    refetchTodayDiarySummary();
  };

  const confirmDeleteEntry = (entry: FoodEntryDetailResponseDTO) => {
    alert(
      "Delete food",
      `Remove "${getEntryFoodName(entry)}" from this diary?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setFoodActionFeedback(null);
            deleteEntryMutation.mutate(entry.id);
          },
        },
      ],
    );
  };
  const prog = todayDairySummary?.progress;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TabScreenScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshDiary}
            />
          }
        >
          <FoodDiaryPageHeader
            feedback={
              foodActionFeedback?.surface === "page"
                ? foodActionFeedback
                : undefined
            }
            onDateChange={setSelectedDate}
            onDismissFeedback={() => setFoodActionFeedback(null)}
            selectedDate={selectedDate}
          />

          {profileLoading && <FoodDiaryInitialSkeleton />}

          {hasProfile && (
            <NutritionProfileOverview profile={profile} theme={theme} />
          )}

          {/* ── ONBOARDING FORM (step by step) ─────────────────────────────── */}
          {formOpen && (
            <ShadowGlowCard style={{ padding: 16 }}>
              <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                <Text style={styles.sectionTitle}>
                  {step === 0
                    ? "Step 1 — Your Body"
                    : step === 1
                      ? "Step 2 — Activity"
                      : "Step 3 — Your Goal"}
                </Text>
                <IconButton
                  accessibilityLabel="Close nutrition profile"
                  icon={
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={theme.textLight}
                    />
                  }
                  onPress={() => {
                    setFormOpen(false);
                    setFoodActionFeedback(null);
                  }}
                  size="compact"
                  variant="ghost"
                />
              </View>

              {foodActionFeedback?.surface === "profile" ? (
                <ActionStatus
                  {...foodActionFeedback}
                  onDismiss={() => setFoodActionFeedback(null)}
                />
              ) : null}

              {/* Step 0 — body metrics */}
              {step === 0 && (
                <>
                  <View style={[styles.chipRow, { marginBottom: 12 }]}>
                    {genderOptions.map((g) => (
                      <SelectionCard
                        key={g.value}
                        compact
                        label={g.label}
                        onPress={() => setGender(g.value)}
                        selected={gender === g.value}
                        style={{ flex: 1 }}
                      />
                    ))}
                  </View>
                  <FormField
                    label="Weight"
                    placeholder="Weight (kg)"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                  <FormField
                    label="Height"
                    placeholder="Height (cm)"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={height}
                    onChangeText={setHeight}
                  />
                  <FormField
                    label="Age"
                    placeholder="Age"
                    placeholderTextColor={theme.textLight}
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                  />
                  <AppButton label="Next" onPress={() => setStep(1)} />
                </>
              )}

              {/* Step 1 — activity level */}
              {step === 1 && (
                <>
                  {activityOptions.map((a) => (
                    <SelectionCard
                      key={a.value}
                      description={a.desc}
                      label={a.label}
                      onPress={() => setActivity(a.value)}
                      selected={activity === a.value}
                      style={{ marginBottom: 8 }}
                    />
                  ))}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    <AppButton
                      label="Back"
                      onPress={() => setStep(0)}
                      style={{ flex: 1 }}
                      variant="secondary"
                    />
                    <AppButton
                      label="Next"
                      onPress={() => setStep(2)}
                      style={{ flex: 2 }}
                    />
                  </View>
                </>
              )}

              {/* Step 2 — goal */}
              {step === 2 && (
                <>
                  {goalOptions.map((g) => (
                    <SelectionCard
                      key={g.value}
                      description={g.desc}
                      label={g.label}
                      onPress={() => setGoal(g.value)}
                      selected={goal === g.value}
                      style={{ marginBottom: 8 }}
                    />
                  ))}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    <AppButton
                      label="Back"
                      onPress={() => setStep(1)}
                      style={{ flex: 1 }}
                      variant="secondary"
                    />
                    <AppButton
                      label="Save Profile"
                      loading={saveMutation.isPending}
                      onPress={saveProfile}
                      style={{ flex: 2 }}
                    />
                  </View>
                </>
              )}
            </ShadowGlowCard>
          )}

          {/* ── MANUAL OVERRIDE FORM ─────────────────────────────────── */}
          {overrideOpen && (
            <ShadowGlowCard style={{ padding: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Override Goals</Text>
                <IconButton
                  accessibilityLabel="Close goal override"
                  icon={
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={theme.textLight}
                    />
                  }
                  onPress={() => {
                    setOverrideOpen(false);
                    setFoodActionFeedback(null);
                  }}
                  size="compact"
                  variant="ghost"
                />
              </View>
              {foodActionFeedback?.surface === "override" ? (
                <ActionStatus
                  {...foodActionFeedback}
                  onDismiss={() => setFoodActionFeedback(null)}
                />
              ) : null}
              <View
                style={{
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 12,
                  marginTop: 12,
                }}
              >
                {[
                  {
                    label: "Calories (kcal)",
                    val: oCalories,
                    set: setOCalories,
                  },
                  { label: "Protein (g)", val: oProtein, set: setOProtein },
                  { label: "Carbs (g)", val: oCarbs, set: setOCarbs },
                  { label: "Fat (g)", val: oFat, set: setOFat },
                ].map(({ label, val, set }) => (
                  <FormField
                    key={label}
                    label={label}
                    placeholder={label}
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={val}
                    onChangeText={set}
                  />
                ))}
              </View>
              <AppButton
                label="Save Goals"
                onPress={saveOverride}
                loading={overrideMutation.isPending}
              />
            </ShadowGlowCard>
          )}

          {/* ── NO PROFILE YET ─────────────────────────────────────────────── */}
          {!hasProfile && !formOpen && !profileLoading && (
            <StatePanel
              variant="empty"
              title="Set up your nutrition profile"
              message="Add your body profile to receive personalized calorie and macro goals."
              primaryAction={{ label: "Get started", onPress: openForm }}
            />
          )}

          {hasProfile && !formOpen && !overrideOpen && (
            <>
              <ShadowGlowCard
                style={{
                  borderColor: theme.primary + "20",
                  borderWidth: 1.5,
                }}
              >
                <View style={[styles.sectionHeader, { marginBottom: 14 }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={styles.sectionTitle}>Intake Summary</Text>
                  </View>
                  <Text
                    style={[
                      styles.listMeta,
                      {
                        color: statusColor(todayDairySummary?.status, theme),
                        fontWeight: "800",
                        fontFamily: "PlusJakartaSans_800ExtraBold",
                      },
                    ]}
                  >
                    {summaryLoading
                      ? "..."
                      : statusLabel(todayDairySummary?.status)}
                  </Text>
                </View>

                {summaryLoading ? (
                  <IntakeSummarySkeleton />
                ) : prog ? (
                  <>
                    {/* Big calorie stats */}
                    <View style={[styles.heroStats, { marginBottom: 16 }]}>
                      <View style={styles.heroStat}>
                        <Text
                          style={[
                            styles.heroStatLabel,
                            { color: nutritionAccents.calories },
                          ]}
                        >
                          Consumed
                        </Text>
                        <Text
                          style={[
                            styles.heroStatValue,
                            { color: nutritionAccents.calories },
                          ]}
                        >
                          {prog.calories.consumed.toFixed(0)}
                        </Text>
                        <Text style={styles.listMeta}>kcal</Text>
                      </View>
                      <View style={styles.heroDivider} />
                      <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Goal</Text>
                        <Text style={styles.heroStatValue}>
                          {prog.calories.goal.toFixed(0)}
                        </Text>
                        <Text style={styles.listMeta}>kcal</Text>
                      </View>
                      <View style={styles.heroDivider} />
                      <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Remaining</Text>
                        <Text style={styles.heroStatValue}>
                          {prog.calories.remaining.toFixed(0)}
                        </Text>
                        <Text style={styles.listMeta}>kcal</Text>
                      </View>
                    </View>

                    {/* Macro progress bars */}
                    <MacroBar
                      label="Protein"
                      unit="g"
                      progress={prog.protein}
                      color={nutritionAccents.protein}
                      theme={theme}
                      style={styles}
                    />
                    <MacroBar
                      label="Carbohydrate"
                      unit="g"
                      progress={prog.carbohydrate}
                      color={nutritionAccents.carbohydrate}
                      theme={theme}
                      style={styles}
                    />
                    <MacroBar
                      label="Fat"
                      unit="g"
                      progress={prog.fat}
                      color={nutritionAccents.fat}
                      theme={theme}
                      style={styles}
                    />
                    {openMoreMacros && (
                      <>
                        <MacroBar
                          label="Fiber"
                          unit="g"
                          progress={prog.fiber}
                          color={theme.tertiary}
                          theme={theme}
                          style={styles}
                        />
                        <MacroBar
                          label="Sugar"
                          unit="g"
                          progress={prog.sugar}
                          color={semantics.warning}
                          theme={theme}
                          style={styles}
                        />
                        <MacroBar
                          label="Sodium"
                          unit="mg"
                          progress={prog.sodium}
                          color={semantics.success}
                          theme={theme}
                          style={styles}
                        />
                        <MacroBar
                          label="Cholesterol"
                          unit="mg"
                          progress={prog.cholesterol}
                          color={nutritionAccents.calories}
                          theme={theme}
                          style={styles}
                        />
                        <MacroBar
                          label="Potassium"
                          unit="mg"
                          progress={prog.potassium}
                          color={semantics.info}
                          theme={theme}
                          style={styles}
                        />
                      </>
                    )}

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={
                          openMoreMacros
                            ? "Hide additional nutrients"
                            : "Show additional nutrients"
                        }
                        accessibilityState={{ expanded: openMoreMacros }}
                        hitSlop={8}
                        onPress={() => setOpenMoreMacros(!openMoreMacros)}
                      >
                        <Text style={styles.inlineActionText}>
                          {openMoreMacros ? "Less Macros" : "More Macros"}
                        </Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Open nutrition profile"
                          hitSlop={6}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            backgroundColor: theme.primary + "12",
                          }}
                          onPress={openForm}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "800",
                              fontFamily: "PlusJakartaSans_800ExtraBold",
                              color: theme.primary,
                            }}
                          >
                            Edit Profile
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Override nutrition goals"
                          hitSlop={6}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            backgroundColor: theme.primary + "12",
                          }}
                          onPress={openOverride}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "800",
                              fontFamily: "PlusJakartaSans_800ExtraBold",
                              color: theme.primary,
                            }}
                          >
                            Override
                          </Text>
                        </TouchableOpacity>

                        {/* {goals?.is_manual && (
                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                              backgroundColor: theme.primary + "12",
                            }}
                            onPress={() => recalcMutation.mutate(null)}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: theme.primary }}>
                              Auto
                            </Text>
                          </TouchableOpacity>
                        )} */}
                      </View>
                    </View>
                  </>
                ) : (
                  <StatePanel
                    variant="empty"
                    compact
                    embedded
                    title="No nutrition recorded"
                    message="Log your first food to start today's calorie and macro summary."
                    primaryAction={{
                      label: "Search food",
                      onPress: () =>
                        setFoodLoggingOpenRequest((request) => request + 1),
                    }}
                  />
                )}
              </ShadowGlowCard>

              <FoodDiaryEntriesSection
                entries={todayDairySummary?.entries}
                isLoading={summaryDiaryLoading}
                onAddFood={() =>
                  setFoodLoggingOpenRequest((request) => request + 1)
                }
                onDelete={confirmDeleteEntry}
              />
            </>
          )}
          {/* Segmented Selector for Add Food / Meal Prep */}

          {hasProfile && !formOpen && !overrideOpen && (
            <SegmentedControl
              accessibilityLabel="Food logging mode"
              value={activeTab}
              options={[
                { value: "SINGLE", label: "Single Food" },
                { value: "PREP", label: "Prep Food" },
              ]}
              onChange={setActiveTab}
            />
          )}

          {/* Conditional rendering based on activeTab */}
          {hasProfile && !formOpen && !overrideOpen && activeTab === "PREP" && (
            <MealPrepSection />
          )}

          {hasProfile && !formOpen && !overrideOpen && activeTab === "SINGLE" && (
            <FoodLoggingFlow
              selectedDate={selectedDate}
              openRequest={foodLoggingOpenRequest}
            />
          )}
        </TabScreenScrollView>
      </KeyboardAvoidingView>
</SafeAreaView>
  );
}
const statusLabel = (status?: string) => {
  if (status === "ON_TRACK") return "On Track ✓";
  if (status === "OVER") return "Over Goal ↑";
  return "Under Goal ↓";
};
