import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import {
  useNutritionGoals,
  useNutritionProfile,
  useOverrideGoals,
  useRecalculateGoals,
  useSaveNutritionProfile,
  useTodayDiarySummary,
} from "@/hooks/useNutrition";
import {
  ActivityLevel,
  Gender,
  GoalType,
  MacroProgress,
} from "@/services/nutritionService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Option data ───────────────────────────────────────────────────────────────

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
  emoji: string;
}[] = [
  { value: "CUT", label: "Cut", desc: "Lose fat (−500 kcal)", emoji: "🔥" },
  { value: "MAINTAIN", label: "Maintain", desc: "Stay the same", emoji: "⚖️" },
  {
    value: "BULK",
    label: "Bulk",
    desc: "Build muscle (+300 kcal)",
    emoji: "💪",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColor = (status?: string, theme?: any) => {
  if (status === "ON_TRACK") return theme?.income ?? "#2ecc71";
  if (status === "OVER") return theme?.expense ?? "#e74c3c";
  return theme?.textLight ?? "#999";
};

const statusLabel = (status?: string) => {
  if (status === "ON_TRACK") return "On Track ✓";
  if (status === "OVER") return "Over Goal ↑";
  return "Under Goal ↓";
};

// ── MacroBar component ────────────────────────────────────────────────────────

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
  theme: any;
  style: any;
}) {
  const pct = Math.min(progress.percentage, 100);
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text style={style.listMeta}>{label}</Text>
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
            width: `${pct}%`,
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NutritionProfileScreen() {
  const { theme } = useTheme();
  const style = gymStyles(theme);
  const router = useRouter();

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useNutritionProfile();
  const {
    data: goals,
    isLoading: goalsLoading,
    refetch: refetchGoals,
  } = useNutritionGoals();
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useTodayDiarySummary();

  const saveMutation = useSaveNutritionProfile();
  const overrideMutation = useOverrideGoals();
  const recalcMutation = useRecalculateGoals();

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

  const isLoading = profileLoading || goalsLoading || summaryLoading;
  const hasProfile = !!profile;

  const openForm = () => {
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
    if (!w || !h || !a)
      return Alert.alert("Missing info", "Fill in weight, height, and age.");
    console.log({
      weight_kg: w,
      height_cm: h,
      age: a,
      gender,
      activity_level: activity,
      goal_type: goal,
    });
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
          setFormOpen(false);
          Alert.alert(
            "Profile saved!",
            `Your daily goal: ${res.calculated_calories.toFixed(0)} kcal\nTDEE: ${res.calculated_tdee.toFixed(0)} kcal`,
          );
        },
        onError: (e: any) => Alert.alert("Save failed", e.message),
      },
    );
  };

  const saveOverride = () => {
    const c = parseFloat(oCalories),
      p = parseFloat(oProtein),
      cb = parseFloat(oCarbs),
      f = parseFloat(oFat);
    if (!c || !p || !cb || !f)
      return Alert.alert(
        "Required",
        "Calories, protein, carbs and fat are required.",
      );
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
        onSuccess: () => {
          setOverrideOpen(false);
          Alert.alert("Goals updated!");
        },
        onError: (e: any) => Alert.alert("Update failed", e.message),
      },
    );
  };

  const confirmRecalc = () =>
    Alert.alert(
      "Reset goals?",
      "This will recalculate your goals from your body profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: () =>
            recalcMutation.mutate(undefined, {
              onSuccess: () => Alert.alert("Goals recalculated!"),
              onError: (e: any) => Alert.alert("Failed", e.message),
            }),
        },
      ],
    );

  const prog = summary?.progress;
  const calColor = prog
    ? prog.calories.percentage > 110
      ? (theme.expense ?? "#e74c3c")
      : prog.calories.percentage >= 85
        ? (theme.income ?? "#2ecc71")
        : (theme.textLight ?? "#999")
    : theme.primary;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={style.safeArea}>
      <ScrollView
        contentContainerStyle={style.container}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              refetchProfile();
              refetchGoals();
              refetchSummary();
            }}
          />
        }
      >
        {/* Header */}
        <View style={style.header}>
          <View>
            <Text style={style.eyebrow}>Nutrition</Text>
            <Text style={style.title}>Daily Tracker</Text>
          </View>
          <TouchableOpacity style={style.inlineAction} onPress={openForm}>
            <MaterialIcons
              name={hasProfile ? "edit" : "add"}
              size={16}
              color={theme.primary}
            />
            <Text style={style.inlineActionText}>
              {hasProfile ? "Edit Profile" : "Set Up"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── ONBOARDING FORM (step by step) ─────────────────────────────── */}
        {formOpen && (
          <View style={style.exerciseCard}>
            <View style={style.sectionHeader}>
              <Text style={style.sectionTitle}>
                {step === 0
                  ? "Step 1 — Your Body"
                  : step === 1
                    ? "Step 2 — Activity"
                    : "Step 3 — Your Goal"}
              </Text>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <MaterialIcons name="close" size={20} color={theme.textLight} />
              </TouchableOpacity>
            </View>

            {/* Step 0 — body metrics */}
            {step === 0 && (
              <>
                <View style={style.chipRow}>
                  {genderOptions.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      style={[
                        style.filterChip,
                        gender === g.value && style.filterChipActive,
                      ]}
                      onPress={() => setGender(g.value)}
                    >
                      <Text
                        style={[
                          style.filterChipText,
                          gender === g.value && style.filterChipTextActive,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={style.input}
                  placeholder="Weight (kg)"
                  placeholderTextColor={theme.textLight}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
                <TextInput
                  style={style.input}
                  placeholder="Height (cm)"
                  placeholderTextColor={theme.textLight}
                  keyboardType="decimal-pad"
                  value={height}
                  onChangeText={setHeight}
                />
                <TextInput
                  style={style.input}
                  placeholder="Age"
                  placeholderTextColor={theme.textLight}
                  keyboardType="number-pad"
                  value={age}
                  onChangeText={setAge}
                />
                <TouchableOpacity
                  style={style.primaryButton}
                  onPress={() => setStep(1)}
                >
                  <Text style={style.primaryButtonText}>Next →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 1 — activity level */}
            {step === 1 && (
              <>
                {activityOptions.map((a) => (
                  <TouchableOpacity
                    key={a.value}
                    style={[
                      style.listCard,
                      activity === a.value && {
                        borderColor: theme.primary,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setActivity(a.value)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View>
                        <Text style={style.listTitle}>{a.label}</Text>
                        <Text style={style.listMeta}>{a.desc}</Text>
                      </View>
                      {activity === a.value && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={theme.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[style.filterChip, { flex: 1 }]}
                    onPress={() => setStep(0)}
                  >
                    <Text style={style.filterChipText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[style.primaryButton, { flex: 2 }]}
                    onPress={() => setStep(2)}
                  >
                    <Text style={style.primaryButtonText}>Next →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 2 — goal */}
            {step === 2 && (
              <>
                {goalOptions.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[
                      style.listCard,
                      goal === g.value && {
                        borderColor: theme.primary,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setGoal(g.value)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View>
                        <Text style={style.listTitle}>
                          {g.emoji} {g.label}
                        </Text>
                        <Text style={style.listMeta}>{g.desc}</Text>
                      </View>
                      {goal === g.value && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={theme.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[style.filterChip, { flex: 1 }]}
                    onPress={() => setStep(1)}
                  >
                    <Text style={style.filterChipText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[style.primaryButton, { flex: 2 }]}
                    onPress={saveProfile}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <ActivityIndicator color={theme.white} />
                    ) : (
                      <Text style={style.primaryButtonText}>Save Profile</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── NO PROFILE YET ─────────────────────────────────────────────── */}
        {!hasProfile && !formOpen && !profileLoading && (
          <View style={style.subEmptyCard}>
            <Text style={style.subEmptyText}>
              Set up your body profile to get personalized calorie and macro
              goals.
            </Text>
            <TouchableOpacity
              style={[style.primaryButton, { marginTop: 12 }]}
              onPress={openForm}
            >
              <Text style={style.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PROFILE SUMMARY CARD ───────────────────────────────────────── */}
        {hasProfile && (
          <View style={style.exerciseCard}>
            <Text style={style.sectionTitle}>Your Profile</Text>
            <View style={style.heroStats}>
              <View style={style.heroStat}>
                <Text style={style.heroStatLabel}>Weight</Text>
                <Text style={style.heroStatValue}>{profile.weight_kg}kg</Text>
              </View>
              <View style={style.heroDivider} />
              <View style={style.heroStat}>
                <Text style={style.heroStatLabel}>Height</Text>
                <Text style={style.heroStatValue}>{profile.height_cm}cm</Text>
              </View>
              <View style={style.heroDivider} />
              <View style={style.heroStat}>
                <Text style={style.heroStatLabel}>TDEE</Text>
                <Text style={style.heroStatValue}>
                  {profile.calculated_tdee?.toFixed(0)}
                </Text>
              </View>
              <View style={style.heroDivider} />
              <View style={style.heroStat}>
                <Text style={style.heroStatLabel}>Goal</Text>
                <Text style={style.heroStatValue}>{profile.goal_type}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── TODAY'S CALORIE STATUS ─────────────────────────────────────── */}
        {hasProfile && (
          <View style={style.exerciseCard}>
            <View style={style.sectionHeader}>
              <Text style={style.sectionTitle}>Today's Intake</Text>
              <Text
                style={[
                  style.listMeta,
                  {
                    color: statusColor(summary?.status, theme),
                    fontWeight: "700",
                  },
                ]}
              >
                {summaryLoading ? "..." : statusLabel(summary?.status)}
              </Text>
            </View>

            {summaryLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : prog ? (
              <>
                {/* Big calorie ring/display */}
                <View style={[style.heroStats, { marginBottom: 16 }]}>
                  <View style={style.heroStat}>
                    <Text style={style.heroStatLabel}>Consumed</Text>
                    <Text style={[style.heroStatValue, { color: calColor }]}>
                      {prog.calories.consumed.toFixed(0)}
                    </Text>
                    <Text style={style.listMeta}>kcal</Text>
                  </View>
                  <View style={style.heroDivider} />
                  <View style={style.heroStat}>
                    <Text style={style.heroStatLabel}>Goal</Text>
                    <Text style={style.heroStatValue}>
                      {prog.calories.goal.toFixed(0)}
                    </Text>
                    <Text style={style.listMeta}>kcal</Text>
                  </View>
                  <View style={style.heroDivider} />
                  <View style={style.heroStat}>
                    <Text style={style.heroStatLabel}>Remaining</Text>
                    <Text style={style.heroStatValue}>
                      {prog.calories.remaining.toFixed(0)}
                    </Text>
                    <Text style={style.listMeta}>kcal</Text>
                  </View>
                </View>

                {/* Macro progress bars */}
                <MacroBar
                  label="Protein"
                  unit="g"
                  progress={prog.protein}
                  color={theme.primary}
                  theme={theme}
                  style={style}
                />
                <MacroBar
                  label="Carbohydrate"
                  unit="g"
                  progress={prog.carbohydrate}
                  color={theme.income ?? "#2ecc71"}
                  theme={theme}
                  style={style}
                />
                <MacroBar
                  label="Fat"
                  unit="g"
                  progress={prog.fat}
                  color={theme.expense ?? "#e74c3c"}
                  theme={theme}
                  style={style}
                />
                {/* <MacroBar
                  label="Fiber"
                  unit="g"
                  progress={prog.fiber}
                  color={theme.teriary ?? "#9b59b6"}
                  theme={theme}
                  style={style}
                />
                <MacroBar
                  label="Sugar"
                  unit="g"
                  progress={prog.sugar}
                  color={"#f39c12"}
                  theme={theme}
                  style={style}
                />
                <MacroBar
                  label="Sodium"
                  unit="mg"
                  progress={prog.sodium}
                  color={"#1abc9c"}
                  theme={theme}
                  style={style}
                />
                <MacroBar
                  label="Cholesterol"
                  unit="mg"
                  progress={prog.cholesterol}
                  color={"#e67e22"}
                  theme={theme}
                  style={style}
                />
                <MacroBar
                  label="Potassium"
                  unit="mg"
                  progress={prog.potassium}
                  color={"#3498db"}
                  theme={theme}
                  style={style}
                /> */}
              </>
            ) : (
              <Text style={style.subEmptyText}>
                No food logged today. Go log a meal!
              </Text>
            )}
          </View>
        )}

        {/* ── GOAL SETTINGS ─────────────────────────────────────────────── */}
        {hasProfile && goals && (
          <View style={style.exerciseCard}>
            <View style={style.sectionHeader}>
              <Text style={style.sectionTitle}>
                Daily Goals {goals.manualOverride ? "✏️ Manual" : "⚡ Auto"}
              </Text>
            </View>

            <View style={style.setTable}>
              <View style={style.setTableHeader}>
                <Text style={style.setHeaderText}>Cal</Text>
                <Text style={style.setHeaderText}>Protein</Text>
                <Text style={style.setHeaderText}>Carbs</Text>
                <Text style={style.setHeaderText}>Fat</Text>
              </View>
              <View style={style.setRow}>
                <Text style={style.setValue}>
                  {goals.calories_goal?.toFixed(0)}
                </Text>
                <Text style={style.setValue}>
                  {goals.protein_goal?.toFixed(0)}g
                </Text>
                <Text style={style.setValue}>
                  {goals.carbs_goal?.toFixed(0)}g
                </Text>
                <Text style={style.setValue}>
                  {goals.fat_goal?.toFixed(0)}g
                </Text>
              </View>
            </View>

            <View style={[style.chipRow, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[
                  style.filterChip,
                  style.filterChipActive,
                  { flexDirection: "row" },
                ]}
                onPress={openOverride}
              >
                <MaterialIcons
                  name="edit"
                  size={14}
                  color={theme.background ?? theme.primary}
                />
                <Text
                  style={[style.filterChipText, style.filterChipTextActive]}
                >
                  {" "}
                  Edit Goals
                </Text>
              </TouchableOpacity>
              {goals.manualOverride && (
                <TouchableOpacity
                  style={style.filterChip}
                  onPress={confirmRecalc}
                  disabled={recalcMutation.isPending}
                >
                  <MaterialIcons
                    name="refresh"
                    size={14}
                    color={theme.primary}
                  />
                  <Text style={style.filterChipText}> Reset to Auto</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── MANUAL OVERRIDE FORM ─────────────────────────────────── */}
            {overrideOpen && (
              <View style={{ marginTop: 12 }}>
                <View style={style.sectionHeader}>
                  <Text style={style.sectionTitle}>Override Goals</Text>
                  <TouchableOpacity onPress={() => setOverrideOpen(false)}>
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={theme.textLight}
                    />
                  </TouchableOpacity>
                </View>
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
                    //   { label: "Fiber (g)", val: oFiber, set: setOFiber },
                    //   { label: "Sodium (mg)", val: oSodium, set: setOSodium },
                    //   { label: "Sugar (g)", val: oSugar, set: setOSugar },
                    //   {
                    //     label: "Cholesterol (mg)",
                    //     val: oCholesterol,
                    //     set: setOCholesterol,
                    //   },
                    //   {
                    //     label: "Potassium (mg)",
                    //     val: oPotassium,
                    //     set: setOPotassium,
                    //   },
                  ].map(({ label, val, set }) => (
                    <TextInput
                      key={label}
                      style={style.input}
                      placeholder={label}
                      placeholderTextColor={theme.textLight}
                      keyboardType="decimal-pad"
                      value={val}
                      onChangeText={set}
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={style.primaryButton}
                  onPress={saveOverride}
                  disabled={overrideMutation.isPending}
                >
                  {overrideMutation.isPending ? (
                    <ActivityIndicator color={theme.white} />
                  ) : (
                    <Text style={style.primaryButtonText}>Save Goals</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
