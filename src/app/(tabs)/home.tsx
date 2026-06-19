import { gymStyles } from "@/assets/styles/gym.style";
import { profileStyles } from "@/assets/styles/profile.style";
import { useAlert } from "@/context/AlertContext";
import { useDiaryContext } from "@/context/DairyContext";
import { useTheme } from "@/context/ThemeContext";
import { useActiveSession } from "@/hooks/useActiveSession";
import {
    FOOD_DIARY_QUERY_KEY,
    useFoodDiarySummary,
    useFoodEntries,
} from "@/hooks/useFoodDiary";
import { useGymDashboard } from "@/hooks/useGymDashboard";
import {
    useNutritionGoals,
    useNutritionProfile,
    useOverrideGoals,
    useRecalculateGoals,
    useSaveNutritionProfile,
    useTodayDiarySummary,
} from "@/hooks/useNutrition";
import {
    createFoodEntry,
    deleteFoodEntry,
    FatSecretFoodDetail,
    FatSecretSearchFood,
    FoodEntryDetailResponseDTO,
    getFatSecretFood,
    MealType,
    searchFatSecretFoods,
} from "@/services/foodDiaryService";
import {
    ExerciseProgressionDTO,
    ExerciseSessionDTO,
    SplitType,
} from "@/services/gymService";
import { ActivityLevel, Gender, GoalType } from "@/services/nutritionService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MacroBar } from "../(pages)/nutritionProfile";

const mealOptions: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

const formatDateForApi = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const toEpochDay = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateForApi(date);
};

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const parseNumber = (value?: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getEntryValue = (
  entry: FoodEntryDetailResponseDTO,
  snakeKey: string,
  camelKey?: string,
) => {
  const source = entry as Record<string, unknown>;
  return source[snakeKey] ?? (camelKey ? source[camelKey] : undefined);
};

const getEntryDate = (entry: FoodEntryDetailResponseDTO) =>
  String(
    getEntryValue(entry, "entry_date", "entryDate") ?? entry.date ?? "",
  ).slice(0, 10);

const getEntryMeal = (entry: FoodEntryDetailResponseDTO) =>
  String(getEntryValue(entry, "meal_type", "mealType") ?? "MEAL");

const getEntryFoodName = (entry: FoodEntryDetailResponseDTO) =>
  String(getEntryValue(entry, "food_name", "foodName") ?? "Food");

const getEntryServing = (entry: FoodEntryDetailResponseDTO) =>
  String(
    getEntryValue(entry, "serving_description", "servingDescription") ?? "",
  );

const getEntryMacro = (
  entry: FoodEntryDetailResponseDTO,
  snakeKey: string,
  camelKey?: string,
) => parseNumber(getEntryValue(entry, snakeKey, camelKey) as string | number);

const getPageEntries = (page?: {
  data?: FoodEntryDetailResponseDTO[];
  content?: FoodEntryDetailResponseDTO[];
}) => page?.data ?? page?.content ?? [];

const getSummaryMacro = (
  summary: ReturnType<typeof useFoodDiarySummary>["data"],
  totalKey: string,
  fallbackKey: string,
) => {
  const source = summary as Record<string, unknown> | undefined;
  return (
    parseNumber(source?.[totalKey] as string | number) ||
    parseNumber(source?.[fallbackKey] as string | number)
  );
};
const statusColor = (status?: string, theme?: any) => {
  if (status === "ON_TRACK") return theme?.income ?? "#2ecc71";
  if (status === "OVER") return theme?.expense ?? "#e74c3c";
  return theme?.textLight ?? "#aaa";
};

const normalizeSplit = (split?: string): SplitType => {
  const normalized = split?.toUpperCase();

  if (normalized === "PULL" || normalized === "LEGS") return normalized;
  return "PUSH";
};

const displaySplit = (split?: string) => {
  const normalized = normalizeSplit(split);
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
};

const getExerciseName = (exercise: ExerciseProgressionDTO) =>
  exercise.name ?? "Exercise";

const getWorkoutSets = (exercise: ExerciseProgressionDTO) =>
  exercise.workout_sets ?? exercise.last_workout_sets ?? [];

const getExerciseSessions = (exercise: ExerciseProgressionDTO) =>
  exercise.exercise_sessions ?? [];

const getSessionSets = (session: ExerciseSessionDTO) => session.sets ?? [];

const formatSessionLabel = (value?: string) => {
  if (!value) return "Undated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
const getDayMonthYear = (value?: string) => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (!value) return "";

  const month = monthNames[new Date(value).getMonth()];
  const day = new Date(value).getDate();
  const y = new Date(value).getFullYear();
  return month + " " + day + ", " + y;
};
const getDayMonth = (value?: string) => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (!value) return "";

  const month = monthNames[new Date(value).getMonth()];
  const day = new Date(value).getDate();
  return month + " " + day;
};

const toDateSortValue = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const parsed = new Date(value).getTime();
  if (!Number.isNaN(parsed)) return parsed;

  const fallback = Date.parse(value.slice(0, 10));
  return Number.isNaN(fallback) ? Number.MAX_SAFE_INTEGER : fallback;
};

const getSessionDate = (session: ExerciseSessionDTO) =>
  session.session_date ?? "";

export default function Home() {
  const { selectedDate, setSelectedDate } = useDiaryContext();
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
    data: todayDairySummary,
    isLoading: summaryDiaryLoading,
    refetch: refetchTodayDiarySummary,
  } = useTodayDiarySummary(selectedDate);

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
  const router = useRouter();
  const { theme } = useTheme();
  const styles = gymStyles(theme);
  const { storedSession, hasActiveSession, checking, refresh, discard } =
    useActiveSession();
  const { alert } = useAlert();
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const [date, setDate] = useState(new Date());
  const [openDate, setOpenDate] = useState(false);
  const [tableDetail, setTableDetail] = useState(false);
  const [activeSplit, setActiveSplit] = useState("ALL");

  const { data: dashboard, error, refetch, isFetching } = useGymDashboard();

  const exerciseProgressions = useMemo(
    () => dashboard?.exercise_progressions ?? [],
    [dashboard],
  );

  const filteredExercises = useMemo(() => {
    const list =
      activeSplit === "ALL"
        ? exerciseProgressions
        : exerciseProgressions.filter(
            (exercise) => normalizeSplit(exercise.split) === activeSplit,
          );
    return [...list].sort(
      (a, b) =>
        toDateSortValue(a.last_session_date) -
        toDateSortValue(b.last_session_date),
    );
  }, [activeSplit, exerciseProgressions]);

  // Progressive overload stats
  const [best1RM, bestMuscleName] = useMemo(() => {
    let best = 0;
    let muscleName: string = "";
    for (const exercise of exerciseProgressions) {
      const sessions = getExerciseSessions(exercise);
      for (const session of sessions) {
        const sets = getSessionSets(session);
        for (const set of sets) {
          const est1RM = set.weight * (1 + set.reps / 30);
          if (est1RM > best) {
            best = est1RM;
            muscleName = exercise.name ?? "Unknown Exercise";
          }
        }
      }
    }
    return [best, muscleName];
  }, [exerciseProgressions]);

  const totalVolume = useMemo(() => {
    let volume = 0;
    for (const exercise of exerciseProgressions) {
      const sessions = getExerciseSessions(exercise);
      for (const session of sessions) {
        const sets = getSessionSets(session);
        for (const set of sets) {
          volume += set.weight * set.reps;
        }
      }
    }
    return volume;
  }, [exerciseProgressions]);

  const isLoading = profileLoading || goalsLoading || summaryDiaryLoading;
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
      return alert("Missing info", "Fill in weight, height, and age.");
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
          alert(
            "Profile saved!",
            `Your daily goal: ${res.calculated_calories.toFixed(0)} kcal\nTDEE: ${res.calculated_tdee.toFixed(0)} kcal`,
          );
        },
        onError: (e: any) => alert("Save failed", e.message),
      },
    );
  };

  const saveOverride = () => {
    const c = parseFloat(oCalories),
      p = parseFloat(oProtein),
      cb = parseFloat(oCarbs),
      f = parseFloat(oFat);
    if (!c || !p || !cb || !f)
      return alert(
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
          alert("Goals updated!");
        },
        onError: (e: any) => alert("Update failed", e.message),
      },
    );
  };
  const queryClient = useQueryClient();
  const profileStyless = profileStyles(theme);
  const { data: nutritionProfile } = useNutritionProfile();

  const [search, setSearch] = useState("");
  const [openMoreMacros, setOpenMoreMacros] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("BREAKFAST");
  const [selectedFood, setSelectedFood] = useState<FatSecretFoodDetail | null>(
    null,
  );
  const [quantity, setQuantity] = useState("1");
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const calProg = todayDairySummary?.progress?.calories;

  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useFoodDiarySummary(selectedDate);
  const {
    data: entriesPage,
    isLoading: entriesLoading,
    isFetching: entriesFetching,
    refetch: refetchEntries,
  } = useFoodEntries();

  const foodSearchQuery = useQuery({
    queryKey: [...FOOD_DIARY_QUERY_KEY, "fatsecret", search.trim()],
    queryFn: () => searchFatSecretFoods(search),
    enabled: search.trim().length >= 2,
  });

  const foodDetailMutation = useMutation({
    mutationFn: (food: FatSecretSearchFood) => getFatSecretFood(food.food_id),
    onSuccess: (food) => {
      setSelectedFood(food);
      setShowFoodPicker(false);
      setQuantity("1");
    },
    onError: (error: any) => {
      alert("Food detail failed", error.message || "Try another food.");
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: async () => {
      setSelectedFood(null);
      setSearch("");
      setQuantity("1");
      await queryClient.invalidateQueries({ queryKey: FOOD_DIARY_QUERY_KEY });
    },
    onError: (error: any) => {
      alert("Could not save food", error.message || "Please try again.");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: deleteFoodEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FOOD_DIARY_QUERY_KEY });
    },
    onError: (error: any) => {
      alert("Delete failed", error.message || "Please try again.");
    },
  });

  const serving = selectedFood?.serving;
  const quantityNumber = Math.max(parseNumber(quantity), 0);
  const selectedMacros = useMemo(
    () => ({
      calories: parseNumber(serving?.calories) * quantityNumber,
      protein: parseNumber(serving?.protein) * quantityNumber,
      carbohydrate: parseNumber(serving?.carbohydrate) * quantityNumber,
      fat: parseNumber(serving?.fat) * quantityNumber,
    }),
    [serving, quantityNumber],
  );

  const summaryMacros = {
    calories: getSummaryMacro(summary, "totalCalories", "total_calories"),
    protein: getSummaryMacro(summary, "totalProtein", "total_protein"),
    carbohydrate: getSummaryMacro(
      summary,
      "totalCarbohydrate",
      "total_carbohydrate",
    ),
    fat: getSummaryMacro(summary, "totalFat", "total_fat"),
  };

  const dailyEntries = useMemo(() => {
    const summaryEntries = summary?.entries ?? [];
    if (summaryEntries.length) return summaryEntries;

    return getPageEntries(entriesPage).filter(
      (entry) => getEntryDate(entry) === selectedDate,
    );
  }, [entriesPage, selectedDate, summary?.entries]);

  const isRefreshing =
    summaryLoading || entriesLoading || summaryFetching || entriesFetching;

  const refreshDiary = () => {
    refetchSummary();
    refetchEntries();
    refetchTodayDiarySummary();
  };

  const saveSelectedFood = () => {
    if (!selectedFood || !serving) {
      alert("Pick a food first", "Search FatSecret and select a food.");
      return;
    }

    if (quantityNumber <= 0) {
      alert("Quantity needed", "Quantity must be greater than 0.");
      return;
    }

    createEntryMutation.mutate({
      food_id: selectedFood.food_id,
      food_name: selectedFood.food_name,
      serving_id: serving.serving_id,
      serving_description: serving.serving_description,
      quantity: quantityNumber,
      calories: Number(selectedMacros.calories.toFixed(1)),
      protein: Number(selectedMacros.protein.toFixed(1)),
      fat: Number(selectedMacros.fat.toFixed(1)),
      carbohydrate: Number(selectedMacros.carbohydrate.toFixed(1)),
      date: toEpochDay(selectedDate),
      meal_type: selectedMeal,
    });
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
          onPress: () => deleteEntryMutation.mutate(entry.id),
        },
      ],
    );
  };
  const prog = todayDairySummary?.progress;
  const calColor = prog
    ? prog.calories.percentage > 110
      ? (theme.expense ?? "#e74c3c")
      : prog.calories.percentage >= 85
        ? (theme.income ?? "#2ecc71")
        : (theme.textLight ?? "#999")
    : theme.primary;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshDiary}
            />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Home</Text>
              <Text style={styles.title}>Progressify</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            {/* <View style={styles.heroStats}>
              <TouchableOpacity
                style={styles.dateSelectionRowArrow}
                onPress={() => setSelectedDate(addDays(selectedDate, -1))}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={18}
                  color={theme.primary}
                />
                <Text style={styles.heroStatLabel}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateSelectionRow}
                onPress={() => setSelectedDate(formatDateForApi(new Date()))}
              >
                <Text style={styles.heroStatValue}>
                  {selectedDate === formatDateForApi(new Date())
                    ? "Today"
                    : formatDateLabel(selectedDate)}
                </Text>
                <Text style={styles.heroStatLabel}>Reset date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateSelectionRowArrow}
                onPress={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color={theme.primary}
                />
                <Text style={styles.heroStatLabel}>Next</Text>
              </TouchableOpacity>
            </View> */}
            {hasProfile && (
              <View style={styles.exerciseCard}>
                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Weight</Text>
                    <Text style={styles.heroMiniStatSummary}>
                      {profile.weight_kg}kg
                    </Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Height</Text>
                    <Text style={styles.heroMiniStatSummary}>
                      {profile.height_cm}cm
                    </Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>TDEE</Text>
                    <Text style={styles.heroMiniStatSummary}>
                      {profile.calculated_tdee?.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Goal</Text>
                    <Text style={styles.heroMiniStatSummary}>
                      {profile.goal_type}
                    </Text>
                  </View>
                </View>
              </View>
            )}
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
                  <Text style={profileStyless.insightLabel}>Nutrition</Text>
                </View>
                {todayDairySummary && (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: statusColor(todayDairySummary.status, theme),
                    }}
                  >
                    {todayDairySummary.status === "ON_TRACK"
                      ? "On Track ✓"
                      : todayDairySummary.status === "OVER"
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
                        {
                          color: statusColor(todayDairySummary?.status, theme),
                        },
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
                        backgroundColor: statusColor(
                          todayDairySummary?.status,
                          theme,
                        ),
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
                      P:{" "}
                      {todayDairySummary?.progress?.protein?.consumed?.toFixed(
                        1,
                      )}
                      g
                    </Text>
                    <Text style={profileStyless.insightMeta}>
                      C:{" "}
                      {todayDairySummary?.progress?.carbohydrate?.consumed?.toFixed(
                        1,
                      )}
                      g
                    </Text>
                    <Text style={profileStyless.insightMeta}>
                      F:{" "}
                      {todayDairySummary?.progress?.fat?.consumed?.toFixed(1)}g
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={profileStyless.insightMeta}>
                  No food logged today →
                </Text>
              )}
            </TouchableOpacity> */}
            {/* <View style={styles.exerciseCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Daily Calories Needed</Text>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Calories</Text>
                  <View>
                    <Text style={styles.heroStatValue}>
                      {(1700 - summaryMacros.calories).toFixed(0)} kcal
                    </Text>
                    {summaryMacros.calories.toFixed(0) !== "0" && (
                      <Text style={styles.heroCalorieStatLabelLowerCase}>
                        (- {summaryMacros.calories.toFixed(0)} kcal)
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Protein</Text>
                  <View>
                    <Text style={styles.heroStatValue}>
                      {(120 - summaryMacros.protein).toFixed(0)} g
                    </Text>
                    {summaryMacros.protein.toFixed(0) !== "0" && (
                      <Text style={styles.heroCalorieStatLabelLowerCase}>
                        (- {summaryMacros.protein.toFixed(0)} g)
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View> */}
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Progress</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>
                  {exerciseProgressions.length}
                </Text>
                <Text style={styles.heroStatLabel}>exercises</Text>
              </View>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>
                  {best1RM > 0 ? `${best1RM.toFixed(0)}` : "-"}
                </Text>
                <Text style={styles.heroStatLabel}>best 1RM</Text>
                {best1RM > 0 && bestMuscleName ? (
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 9,
                      fontWeight: "700",
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {bestMuscleName}
                  </Text>
                ) : null}
              </View>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>
                  {totalVolume > 0
                    ? totalVolume >= 1000
                      ? `${(totalVolume / 1000).toFixed(1)}k`
                      : totalVolume.toFixed(0)
                    : "-"}
                </Text>
                <Text style={styles.heroStatLabel}>volume</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.startWorkoutCard}
            onPress={() => router.push("/(pages)/workoutSession")}
            activeOpacity={0.7}
          >
            <View style={styles.startWorkoutIconWrap}>
              <MaterialCommunityIcons
                name="dumbbell"
                size={20}
                color={theme.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.startWorkoutTitle}>Start Workout</Text>
              <Text style={styles.startWorkoutMeta}>
                Pick exercises and begin your session
              </Text>
            </View>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={theme.primary}
            />
          </TouchableOpacity>
          {!checking && hasActiveSession && storedSession && (
            <TouchableOpacity
              style={styles.activeSessionBanner}
              onPress={() => router.push("/(pages)/activeWorkoutSession")}
              activeOpacity={0.7}
            >
              <View style={styles.activeSessionDot} />
              <Text style={styles.activeSessionBannerText}>
                {storedSession.split.charAt(0) +
                  storedSession.split.slice(1).toLowerCase()}{" "}
                session — {storedSession.completedIds.length}/
                {storedSession.exerciseIds.length} done
              </Text>
              <Text style={styles.activeSessionBannerAction}>Resume</Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                onPress={(e) => {
                  e.stopPropagation();
                  discard();
                }}
              >
                <MaterialIcons name="close" size={16} color={theme.textLight} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          {/* ── NO PROFILE YET ─────────────────────────────────────────────── */}
          {!hasProfile && !formOpen && !profileLoading && (
            <View style={styles.subEmptyCard}>
              <Text style={styles.subEmptyText}>
                Set up your body profile to get personalized calorie and macro
                goals.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 12 }]}
                onPress={openForm}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PROFILE SUMMARY CARD ───────────────────────────────────────── */}

          {hasProfile && (
            <View style={styles.exerciseCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Calories Intake</Text>
                <Text
                  style={[
                    styles.listMeta,
                    {
                      color: statusColor(todayDairySummary?.status, theme),
                      fontWeight: "700",
                    },
                  ]}
                >
                  {summaryLoading
                    ? "..."
                    : statusLabel(todayDairySummary?.status)}
                </Text>
              </View>

              {summaryLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : prog ? (
                <>
                  {/* Big calorie ring/display */}
                  <View style={[styles.heroStats, { marginBottom: 16 }]}>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatLabel}>Consumed</Text>
                      <Text style={[styles.heroStatValue, { color: calColor }]}>
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
                    color={theme.expense}
                    theme={theme}
                    style={styles}
                  />
                  <MacroBar
                    label="Carbohydrate"
                    unit="g"
                    progress={prog.carbohydrate}
                    color={theme.primary ?? "#2ecc71"}
                    theme={theme}
                    style={styles}
                  />
                  <MacroBar
                    label="Fat"
                    unit="g"
                    progress={prog.fat}
                    color={"#fff240"}
                    theme={theme}
                    style={styles}
                  />
                  {openMoreMacros && (
                    <>
                      <MacroBar
                        label="Fiber"
                        unit="g"
                        progress={prog.fiber}
                        color={theme.teriary ?? "#9b59b6"}
                        theme={theme}
                        style={styles}
                      />
                      <MacroBar
                        label="Sugar"
                        unit="g"
                        progress={prog.sugar}
                        color={"#f39c12"}
                        theme={theme}
                        style={styles}
                      />
                      <MacroBar
                        label="Sodium"
                        unit="mg"
                        progress={prog.sodium}
                        color={"#1abc9c"}
                        theme={theme}
                        style={styles}
                      />
                      <MacroBar
                        label="Cholesterol"
                        unit="mg"
                        progress={prog.cholesterol}
                        color={"#e67e22"}
                        theme={theme}
                        style={styles}
                      />
                      <MacroBar
                        label="Potassium"
                        unit="mg"
                        progress={prog.potassium}
                        color={"#3498db"}
                        theme={theme}
                        style={styles}
                      />
                    </>
                  )}
                  <TouchableOpacity
                    style={{ marginTop: 8, alignSelf: "flex-end" }}
                    onPress={() => setOpenMoreMacros(!openMoreMacros)}
                  >
                    <Text style={styles.inlineActionText}>More Macros</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.subEmptyText}>
                  No food logged today. Go log a meal!
                </Text>
              )}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meal Prep?</Text>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => setShowFoodPicker(true)}
            >
              <MaterialIcons name="search" size={16} color={theme.primary} />
              <Text style={styles.inlineActionText}>Search food</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.exerciseCard}>
            {selectedFood && serving ? (
              <>
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>
                      {selectedFood.food_name}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {selectedFood.brand_name ?? selectedFood.food_type ?? "-"}
                    </Text>
                    <Text style={styles.exerciseSubMeta}>
                      {serving.serving_description ?? "Selected serving"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFood(null)}>
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={theme.textLight}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.chipRow}>
                  {mealOptions.map((meal) => {
                    const active = selectedMeal === meal.value;
                    return (
                      <TouchableOpacity
                        key={meal.value}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
                        onPress={() => setSelectedMeal(meal.value)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            active && styles.filterChipTextActive,
                          ]}
                        >
                          {meal.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="Quantity"
                  placeholderTextColor={theme.textLight}
                  value={quantity}
                  onChangeText={setQuantity}
                />

                <View style={styles.setTable}>
                  <View style={styles.setTableHeader}>
                    <Text style={styles.setHeaderText}>Cal</Text>
                    <Text style={styles.setHeaderText}>Protein</Text>
                    <Text style={styles.setHeaderText}>Carbs</Text>
                    <Text style={styles.setHeaderText}>Fat</Text>
                  </View>
                  <View style={styles.setRow}>
                    <Text style={styles.setValue}>
                      {selectedMacros.calories.toFixed(0)}
                    </Text>
                    <Text style={styles.setValue}>
                      {selectedMacros.protein.toFixed(1)}g
                    </Text>
                    <Text style={styles.setValue}>
                      {selectedMacros.carbohydrate.toFixed(1)}g
                    </Text>
                    <Text style={styles.setValue}>
                      {selectedMacros.fat.toFixed(1)}g
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={saveSelectedFood}
                  disabled={createEntryMutation.isPending}
                >
                  {createEntryMutation.isPending ? (
                    <ActivityIndicator color={theme.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save to Diary</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/nutritionProfile")}
                style={styles.subEmptyCard}
              >
                <View style={styles.subEmptyCard}>
                  <Text style={styles.subEmptyText}>
                    Search FatSecret, select a food, then save it to this day.
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showFoodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFoodPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "78%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find Food</Text>
              <TouchableOpacity onPress={() => setShowFoodPicker(false)}>
                <MaterialIcons name="close" size={22} color={theme.textBlack} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Chicken rice, banana, milk..."
              placeholderTextColor={theme.textLight}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />

            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {foodSearchQuery.isFetching ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={styles.loadingText}>Searching foods...</Text>
                </View>
              ) : search.trim().length < 2 ? (
                <Text style={styles.emptyText}>
                  Type at least 2 characters to search FatSecret.
                </Text>
              ) : foodSearchQuery.data?.length ? (
                foodSearchQuery.data.map((food) => (
                  <TouchableOpacity
                    key={food.food_id}
                    style={styles.listCard}
                    activeOpacity={0.82}
                    onPress={() => foodDetailMutation.mutate(food)}
                    disabled={foodDetailMutation.isPending}
                  >
                    <View style={styles.exerciseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>{food.food_name}</Text>
                        <Text style={styles.listMeta}>
                          {food.brand_name ?? food.food_type ?? "-"}
                        </Text>
                        {!!food.food_description && (
                          <Text style={styles.listSubtle}>
                            {food.food_description}
                          </Text>
                        )}
                      </View>
                      <MaterialIcons
                        name="add-circle-outline"
                        size={22}
                        color={theme.primary}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No foods found. Try another search term.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const statusLabel = (status?: string) => {
  if (status === "ON_TRACK") return "On Track ✓";
  if (status === "OVER") return "Over Goal ↑";
  return "Under Goal ↓";
};
