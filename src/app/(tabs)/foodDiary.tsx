import { gymStyles } from "@/assets/styles/gym.style";
import { profileStyles } from "@/assets/styles/profile.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { SyncStatusBadge } from "@/components/base/SyncStatusBadge";
import { BarcodeScannerModal } from "@/components/nutrition/BarcodeScannerModal";
import { MealPrepSection } from "@/components/nutrition/mealPrepSection";
import { ThemeType } from "@/constants/colors";
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
  useRecalculateGoals,
  useSaveNutritionProfile,
  useTodayDiarySummary,
} from "@/hooks/useNutrition";
import {
  createCustomFood,
  CustomFoodResponse,
  deleteCustomFood,
  searchCustomFoods,
} from "@/services/customFoodService";
import {
  createFoodEntry,
  deleteFoodEntry,
  FatSecretFoodDetail,
  findFoodByBarcode,
  FoodEntryDetailResponseDTO,
  MealType,
} from "@/services/foodDiaryService";
import {
  ActivityLevel,
  Gender,
  GoalType,
  MacroProgress,
} from "@/services/nutritionService";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

const mealOptions: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

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

const MACRO_COLORS = {
  calories: "#4caf50",
  protein: "#f44336",
  carbohydrate: "#2196f3",
  fat: "#ffeb3b",
};

const formatDateForApi = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

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

const MEAL_META: Record<string, { color: string }> = {
  BREAKFAST: { color: "#f69f1d" }, // amber
  LUNCH: { color: "#0090FF" }, // blue
  DINNER: { color: "#2514df" }, // purple
  SNACK: { color: "#1D9E75" }, // teal
};

function MacroPill({
  label,
  value,
  unit,
  bg,
  color,
}: {
  label: string;
  value?: number;
  unit: string;
  bg: string;
  color: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
        {label}
        {label ? " " : ""}
        {value !== undefined
          ? unit.includes("kcal")
            ? value.toFixed(0)
            : value.toFixed(1)
          : "0"}
        {unit}
      </Text>
    </View>
  );
}

function FoodEntryCard({
  entry,
  onDelete,
  theme,
  style,
}: {
  entry: FoodEntryDetailResponseDTO;
  onDelete: (entry: FoodEntryDetailResponseDTO) => void;
  theme: ThemeType;
  style: any;
}) {
  const mealColor = MEAL_META[entry.meal_type]?.color ?? theme.primary;

  return (
    <View
      style={{
        backgroundColor: theme.card ?? "#ffffff",
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: theme.border ?? "#eee",
        borderLeftWidth: 3.5,
        borderLeftColor: mealColor,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={[
            style.listTitle,
            {
              marginBottom: 0,
              fontWeight: "600",
              fontSize: 13.5,
              fontFamily: "PlusJakartaSans_500Medium",
            },
          ]}
        >
          {entry.food_name}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          <MacroPill
            label=""
            value={entry.calories}
            unit=" kcal"
            bg="#FAEEDA"
            color="#633806"
          />
          <MacroPill
            label="P"
            value={entry.protein}
            unit="g"
            bg="#E6F1FB"
            color="#0C447C"
          />
          <MacroPill
            label="C"
            value={entry.carbohydrate}
            unit="g"
            bg="#EAF3DE"
            color="#27500A"
          />
          <MacroPill
            label="F"
            value={entry.fat}
            unit="g"
            bg="#FAECE7"
            color="#712B13"
          />
          <Text
            style={[
              style.listMeta,
              { alignSelf: "center", fontSize: 11, fontWeight: "500" },
            ]}
          >
            · {entry.quantity}g
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onDelete(entry)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: (theme.expense ?? "#A32D2D") + "15",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <MaterialIcons
          name="delete-outline"
          size={17}
          color={theme.expense ?? "#A32D2D"}
        />
      </TouchableOpacity>
    </View>
  );
}

function FoodEntriesByMeal({
  entries,
  onDelete,
  theme,
  style,
}: {
  entries: FoodEntryDetailResponseDTO[];
  onDelete: (entry: FoodEntryDetailResponseDTO) => void;
  theme: any;
  style: any;
}) {
  const grouped = entries.reduce<Record<string, FoodEntryDetailResponseDTO[]>>(
    (acc, entry) => {
      const meal = entry.meal_type ?? "OTHER";
      acc[meal] = [...(acc[meal] ?? []), entry];
      return acc;
    },
    {},
  );

  const mealOrder = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
  const sortedMeals = Object.keys(grouped).sort(
    (a, b) => mealOrder.indexOf(a) - mealOrder.indexOf(b),
  );

  return (
    <>
      {sortedMeals.map((meal) => {
        const mealEntries = grouped[meal];
        const totalCal = mealEntries.reduce((s, e) => s + (e.calories ?? 0), 0);

        return (
          <View key={meal} style={{ marginBottom: 14 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={[
                  style.listTitle,
                  {
                    marginBottom: 0,
                    fontWeight: "700",
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_700Bold",
                  },
                ]}
              >
                {meal.charAt(0) + meal.slice(1).toLowerCase()}
              </Text>
              <View
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 0.5,
                  borderColor: theme.border ?? "#eee",
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: "600",
                    color: theme.textLight,
                    fontFamily: "PlusJakartaSans_500Medium",
                  }}
                >
                  {mealEntries.length} item{mealEntries.length !== 1 ? "s" : ""}{" "}
                  · {totalCal.toFixed(0)} kcal
                </Text>
              </View>
            </View>

            {mealEntries.map((entry) => (
              <FoodEntryCard
                key={entry.id}
                entry={entry}
                onDelete={onDelete}
                theme={theme}
                style={style}
              />
            ))}
          </View>
        );
      })}
    </>
  );
}

export default function FoodDiary() {
  const { theme } = useTheme();
  const styles = gymStyles(theme);
  const router = useRouter();
  const { alert } = useAlert();
  const { selectedDate, setSelectedDate } = useDiaryContext();
  const [activeTab, setActiveTab] = useState<"SINGLE" | "PREP">("SINGLE");
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
  const tabTranslateX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  const isLoading = profileLoading || goalsLoading || summaryDiaryLoading;
  const hasProfile = !!profile;
  useEffect(() => {
    Animated.timing(tabTranslateX, {
      toValue: activeTab === "SINGLE" ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

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
    queryKey: [...FOOD_DIARY_QUERY_KEY, "custom", search.trim()],
    queryFn: () => searchCustomFoods(search.trim()),
  });

  const handleSelectCustomFood = (food: CustomFoodResponse) => {
    setSelectedFood({
      food_id: `custom-${food.id}`,
      food_name: food.food_name,
      food_type: "Custom Food",
      brand_name: "My Food",
      serving: {
        serving_id: String(food.id),
        serving_description: food.serving_description || "1 serving",
        metric_serving_amount: String(food.metric_serving_amount ?? 100),
        metric_serving_unit: "g",
        calories: String(food.calories),
        protein: String(food.protein),
        carbohydrate: String(food.carbohydrate),
        fat: String(food.fat),
      },
    });
    setShowFoodPicker(false);
    setQuantity("1");
  };

  const [showManual, setShowManual] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customServingDesc, setCustomServingDesc] = useState("100g");
  const [customGramation, setCustomGramation] = useState("100");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [customFiber, setCustomFiber] = useState("");
  const [customSodium, setCustomSodium] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const createCustomFoodMutation = useMutation({
    mutationFn: createCustomFood,
    onSuccess: (saved) => {
      handleSelectCustomFood(saved);
      queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "custom"],
      });
      setCustomName("");
      setCustomServingDesc("100g");
      setCustomGramation("100");
      setCustomCalories("");
      setCustomProtein("");
      setCustomCarbs("");
      setCustomFat("");
      setCustomFiber("");
      setCustomSodium("");
      setShowManual(false);
    },
    onError: (error: any) => {
      alert("Create custom food failed", error.message || "Please try again.");
    },
  });

  const deleteCustomFoodMutation = useMutation({
    mutationFn: deleteCustomFood,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "custom"],
      });
    },
    onError: (error: any) => {
      alert("Delete failed", error.message || "Please try again.");
    },
  });

  const handleDeleteCustomFood = (e: any, id: number) => {
    e.stopPropagation();
    alert(
      "Delete Custom Food",
      "Are you sure you want to delete this custom food?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCustomFoodMutation.mutate(id),
        },
      ],
    );
  };

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const barcodeScanMutation = useMutation({
    mutationFn: findFoodByBarcode,
    onSuccess: (food) => {
      setSelectedFood(food);
      setShowBarcodeScanner(false);
      setShowFoodPicker(false);
      setQuantity("1");
    },
    onError: (error: any) => {
      alert("Barcode lookup failed", error.message || "Please try again.");
      setShowBarcodeScanner(false);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: async () => {
      setSelectedFood(null);
      setSearch("");
      setQuantity("1");
      await queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "summary", selectedDate],
      });
      await queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["diary-summary", selectedDate],
      });
    },
    onError: (error: any) => {
      alert("Could not save food", error.message || "Please try again.");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: deleteFoodEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "summary", selectedDate],
      });
      await queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["diary-summary", selectedDate],
      });
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
      date: selectedDate,
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
                Nutrition
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
                Food Diary
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <SyncStatusBadge />
              <View
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
                <MaterialIcons
                  name="restaurant"
                  size={22}
                  color={theme.primary}
                />
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.primary + "06",
              borderRadius: 16,
              padding: 12,
              borderWidth: 1.5,
              borderColor: theme.primary + "20",
              marginBottom: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, -1))}
              activeOpacity={0.7}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.primary + "12",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons
                name="chevron-left"
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedDate(formatDateForApi(new Date()))}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "900",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: theme.textBlack,
                }}
              >
                {selectedDate === formatDateForApi(new Date())
                  ? "Today"
                  : formatDateLabel(selectedDate)}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: theme.textLight,
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Tap to reset date
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, 1))}
              activeOpacity={0.7}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.primary + "12",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>

          {hasProfile && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: theme.primary + "06",
                borderRadius: 14,
                padding: 12,
                borderWidth: 1.5,
                borderColor: theme.primary + "20",
                marginBottom: 8,
              }}
            >
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: theme.textLight,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Weight
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textBlack,
                  }}
                >
                  {profile.weight_kg}kg
                </Text>
              </View>
              <View
                style={{ width: 1, backgroundColor: theme.border + "50" }}
              />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: theme.textLight,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Height
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textBlack,
                  }}
                >
                  {profile.height_cm}cm
                </Text>
              </View>
              <View
                style={{ width: 1, backgroundColor: theme.border + "50" }}
              />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: theme.textLight,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  TDEE
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textBlack,
                  }}
                >
                  {profile.calculated_tdee?.toFixed(0)}
                </Text>
              </View>
              <View
                style={{ width: 1, backgroundColor: theme.border + "50" }}
              />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: theme.textLight,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Goal
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: theme.textBlack,
                  }}
                >
                  {profile.goal_type}
                </Text>
              </View>
            </View>
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
                <TouchableOpacity onPress={() => setFormOpen(false)}>
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={theme.textLight}
                  />
                </TouchableOpacity>
              </View>

              {/* Step 0 — body metrics */}
              {step === 0 && (
                <>
                  <View style={[styles.chipRow, { marginBottom: 12 }]}>
                    {genderOptions.map((g) => (
                      <TouchableOpacity
                        key={g.value}
                        style={[
                          styles.filterChip,
                          gender === g.value && styles.filterChipActive,
                        ]}
                        onPress={() => setGender(g.value)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            gender === g.value && styles.filterChipTextActive,
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Weight (kg)"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Height (cm)"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={height}
                    onChangeText={setHeight}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Age"
                    placeholderTextColor={theme.textLight}
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                  />
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setStep(1)}
                  >
                    <Text style={styles.primaryButtonText}>Next →</Text>
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
                        styles.listCard,
                        activity === a.value && {
                          borderColor: theme.primary,
                          borderWidth: 1.5,
                        },
                        { marginBottom: 8, padding: 12, borderRadius: 12 },
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
                          <Text style={styles.listTitle}>{a.label}</Text>
                          <Text style={styles.listMeta}>{a.desc}</Text>
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
                      style={[
                        styles.filterChip,
                        {
                          flex: 1,
                          height: 42,
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                      onPress={() => setStep(0)}
                    >
                      <Text style={styles.filterChipText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 2 }]}
                      onPress={() => setStep(2)}
                    >
                      <Text style={styles.primaryButtonText}>Next →</Text>
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
                        styles.listCard,
                        goal === g.value && {
                          borderColor: theme.primary,
                          borderWidth: 1.5,
                        },
                        { marginBottom: 8, padding: 12, borderRadius: 12 },
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
                          <Text style={styles.listTitle}>{g.label}</Text>
                          <Text style={styles.listMeta}>{g.desc}</Text>
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
                      style={[
                        styles.filterChip,
                        {
                          flex: 1,
                          height: 42,
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                      onPress={() => setStep(1)}
                    >
                      <Text style={styles.filterChipText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 2 }]}
                      onPress={saveProfile}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <ActivityIndicator color={theme.white} />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          Save Profile
                        </Text>
                      )}
                    </TouchableOpacity>
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
                <TouchableOpacity onPress={() => setOverrideOpen(false)}>
                  <MaterialIcons
                    name="close"
                    size={20}
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
                ].map(({ label, val, set }) => (
                  <TextInput
                    key={label}
                    style={styles.input}
                    placeholder={label}
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={val}
                    onChangeText={set}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={saveOverride}
                disabled={overrideMutation.isPending}
              >
                {overrideMutation.isPending ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Goals</Text>
                )}
              </TouchableOpacity>
            </ShadowGlowCard>
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

          {hasProfile && !formOpen && !overrideOpen && (
            <>
              <ShadowGlowCard
                style={{
                  backgroundColor: theme.primary + "06",
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
                    <MaterialCommunityIcons
                      name="calculator-variant-outline"
                      size={18}
                      color={theme.primary}
                    />
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
                  <ActivityIndicator color={theme.primary} />
                ) : prog ? (
                  <>
                    {/* Big calorie stats */}
                    <View style={[styles.heroStats, { marginBottom: 16 }]}>
                      <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Consumed</Text>
                        <Text
                          style={[styles.heroStatValue, { color: calColor }]}
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

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => setOpenMoreMacros(!openMoreMacros)}
                      >
                        <Text style={styles.inlineActionText}>
                          {openMoreMacros ? "Less Macros" : "More Macros"}
                        </Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
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
                  <Text style={styles.subEmptyText}>
                    No food logged today. Go log a meal!
                  </Text>
                )}
              </ShadowGlowCard>

              {/* Today's Food Entries Section */}
              <ShadowGlowCard
                style={{
                  marginTop: 16,
                  backgroundColor: theme.primary + "06",
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
                    <MaterialCommunityIcons
                      name="food-fork-drink"
                      size={18}
                      color={theme.primary}
                    />
                    <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
                  </View>
                </View>

                {summaryDiaryLoading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : todayDairySummary?.entries &&
                  todayDairySummary.entries.length > 0 ? (
                  <FoodEntriesByMeal
                    entries={todayDairySummary.entries}
                    onDelete={confirmDeleteEntry}
                    theme={theme}
                    style={styles}
                  />
                ) : (
                  <Text style={styles.subEmptyText}>
                    No food logged today. Start adding items below!
                  </Text>
                )}
              </ShadowGlowCard>
            </>
          )}
          {/* Segmented Selector for Add Food / Meal Prep */}

          {hasProfile && !formOpen && !overrideOpen && (
            <View
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
              style={{
                flexDirection: "row",
                backgroundColor: theme.background,
                borderRadius: 24,
                padding: 4,
                borderWidth: 1.5,
                borderColor: theme.border,
                marginVertical: 12,
                position: "relative",
              }}
            >
              {containerWidth > 0 && (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 4,
                    bottom: 4,
                    left: 4,
                    width: (containerWidth - 8) / 2,
                    backgroundColor: theme.primary + "12",
                    borderWidth: 1.5,
                    borderColor: theme.primary + "30",
                    borderRadius: 20,
                    transform: [
                      {
                        translateX: tabTranslateX.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (containerWidth - 8) / 2],
                        }),
                      },
                    ],
                  }}
                />
              )}

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 20,
                }}
                activeOpacity={0.8}
                onPress={() => setActiveTab("SINGLE")}
              >
                <MaterialCommunityIcons
                  name="food-apple"
                  size={18}
                  color={
                    activeTab === "SINGLE" ? theme.primary : theme.textLight
                  }
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color:
                      activeTab === "SINGLE" ? theme.primary : theme.textLight,
                  }}
                >
                  Single Food
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
                }}
                activeOpacity={0.8}
                onPress={() => setActiveTab("PREP")}
              >
                <MaterialCommunityIcons
                  name="food"
                  size={18}
                  color={activeTab === "PREP" ? theme.primary : theme.textLight}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color:
                      activeTab === "PREP" ? theme.primary : theme.textLight,
                  }}
                >
                  Prep Food
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Conditional rendering based on activeTab */}
          {hasProfile && !formOpen && !overrideOpen && activeTab === "PREP" && (
            <MealPrepSection />
          )}

          {hasProfile &&
            !formOpen &&
            !overrideOpen &&
            activeTab === "SINGLE" && (
              <>
                <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                  <Text style={styles.sectionTitle}>Log Food Now</Text>
                  <TouchableOpacity
                    style={styles.inlineAction}
                    onPress={() => setShowFoodPicker(true)}
                  >
                    <MaterialIcons
                      name="search"
                      size={16}
                      color={theme.primary}
                    />
                    <Text style={styles.inlineActionText}>Search food</Text>
                  </TouchableOpacity>
                </View>

                <ShadowGlowCard
                  style={{
                    backgroundColor: theme.primary + "06",
                    borderColor: theme.primary + "20",
                    borderWidth: 1.5,
                  }}
                >
                  {selectedFood && serving ? (
                    <>
                      <View style={styles.exerciseHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName}>
                            {selectedFood.food_name}
                          </Text>
                          <Text style={styles.exerciseMeta}>
                            {selectedFood.brand_name ??
                              selectedFood.food_type ??
                              "-"}
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

                      <View
                        style={[
                          styles.chipRow,
                          { marginBottom: 12, marginTop: 8, flexWrap: "wrap" },
                        ]}
                      >
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
                          <Text style={styles.primaryButtonText}>
                            Save to Diary
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowFoodPicker(true)}
                      activeOpacity={0.8}
                      style={{ paddingVertical: 12, alignItems: "center" }}
                    >
                      <Text
                        style={[
                          styles.subEmptyText,
                          {
                            textAlign: "center",
                            color: theme.primary,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        Tap here to search and log food directly
                      </Text>
                    </TouchableOpacity>
                  )}
                </ShadowGlowCard>
              </>
            )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showFoodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowFoodPicker(false);
          setShowManual(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "88%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showManual ? "Add Custom Food" : "Find Food"}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                {!showManual && (
                  <TouchableOpacity
                    onPress={() => setShowBarcodeScanner(true)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="barcode-scan"
                      size={20}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setShowFoodPicker(false);
                    setShowManual(false);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.textBlack}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {showManual ? (
              <ScrollView
                contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Food name *"
                  placeholderTextColor={theme.textLight}
                  value={customName}
                  onChangeText={setCustomName}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1.2 }]}
                    placeholder="Serving (e.g. 100g)"
                    placeholderTextColor={theme.textLight}
                    value={customServingDesc}
                    onChangeText={setCustomServingDesc}
                  />
                  <TextInput
                    style={[styles.input, { flex: 0.8 }]}
                    placeholder="Weight (g)"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={customGramation}
                    onChangeText={setCustomGramation}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Calories *"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={customCalories}
                    onChangeText={setCustomCalories}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Protein (g) *"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={customProtein}
                    onChangeText={setCustomProtein}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Carbs (g) *"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Fat (g) *"
                    placeholderTextColor={theme.textLight}
                    keyboardType="decimal-pad"
                    value={customFat}
                    onChangeText={setCustomFat}
                  />
                </View>

                {/* Optional fields toggle */}
                <TouchableOpacity
                  onPress={() => setShowOptionalFields(!showOptionalFields)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    alignSelf: "flex-start",
                    marginVertical: 4,
                  }}
                >
                  <MaterialIcons
                    name={showOptionalFields ? "expand-less" : "expand-more"}
                    size={16}
                    color={theme.primary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: theme.primary,
                      fontFamily: "PlusJakartaSans_700Bold",
                    }}
                  >
                    {showOptionalFields
                      ? "Hide Optional"
                      : "Add Fiber & Sodium"}
                  </Text>
                </TouchableOpacity>

                {showOptionalFields && (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Fiber (g)"
                      placeholderTextColor={theme.textLight}
                      keyboardType="decimal-pad"
                      value={customFiber}
                      onChangeText={setCustomFiber}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Sodium (mg)"
                      placeholderTextColor={theme.textLight}
                      keyboardType="decimal-pad"
                      value={customSodium}
                      onChangeText={setCustomSodium}
                    />
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        flex: 1,
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setShowManual(false)}
                  >
                    <Text style={{ color: theme.textLight }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 2 }]}
                    onPress={() => {
                      if (!customName.trim())
                        return alert("Required", "Enter a food name.");
                      if (!customCalories)
                        return alert("Required", "Enter calories.");
                      if (!customProtein)
                        return alert("Required", "Enter protein.");
                      if (!customCarbs)
                        return alert("Required", "Enter carbs.");
                      if (!customFat) return alert("Required", "Enter fat.");
                      createCustomFoodMutation.mutate({
                        food_name: customName.trim(),
                        serving_description: customServingDesc.trim() || "100g",
                        metric_serving_amount:
                          parseFloat(customGramation) || 100,
                        calories: parseFloat(customCalories),
                        protein: parseFloat(customProtein),
                        carbohydrate: parseFloat(customCarbs),
                        fat: parseFloat(customFat),
                        fiber: customFiber
                          ? parseFloat(customFiber)
                          : undefined,
                        sodium: customSodium
                          ? parseFloat(customSodium)
                          : undefined,
                      });
                    }}
                    disabled={createCustomFoodMutation.isPending}
                  >
                    {createCustomFoodMutation.isPending ? (
                      <ActivityIndicator color={theme.white} />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Save & Log Food
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search custom foods..."
                  placeholderTextColor={theme.textLight}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      marginHorizontal: 0,
                      marginBottom: 12,
                      backgroundColor: theme.primary + "12",
                      borderWidth: 1.5,
                      borderColor: theme.primary + "30",
                    },
                  ]}
                  onPress={() => setShowManual(true)}
                >
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 13,
                      fontWeight: "800",
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                    }}
                  >
                    + Create New Custom Food
                  </Text>
                </TouchableOpacity>

                <ScrollView contentContainerStyle={{ gap: 8 }}>
                  {foodSearchQuery.isFetching ? (
                    <View style={styles.loadingState}>
                      <ActivityIndicator color={theme.primary} />
                      <Text style={styles.loadingText}>
                        Searching custom foods...
                      </Text>
                    </View>
                  ) : foodSearchQuery.data?.length ? (
                    foodSearchQuery.data.map((food: CustomFoodResponse) => (
                      <TouchableOpacity
                        key={food.id}
                        style={styles.listCard}
                        activeOpacity={0.82}
                        onPress={() => handleSelectCustomFood(food)}
                      >
                        <View style={styles.exerciseHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listTitle}>
                              {food.food_name}
                            </Text>
                            <Text style={styles.listMeta}>
                              {food.serving_description || "1 serving"} •{" "}
                              {food.calories} kcal
                            </Text>
                            <Text style={styles.listSubtle}>
                              P: {food.protein}g • C: {food.carbohydrate}g • F:{" "}
                              {food.fat}g
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <TouchableOpacity
                              onPress={(e) =>
                                handleDeleteCustomFood(e, food.id)
                              }
                              activeOpacity={0.7}
                              style={{ padding: 4 }}
                            >
                              <MaterialIcons
                                name="delete-outline"
                                size={20}
                                color={theme.expense}
                              />
                            </TouchableOpacity>
                            <MaterialIcons
                              name="add-circle-outline"
                              size={22}
                              color={theme.primary}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      {search
                        ? "No custom foods found."
                        : "No custom foods created yet."}
                    </Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanned={(barcode) => barcodeScanMutation.mutate(barcode)}
        isLoading={barcodeScanMutation.isPending}
      />
    </SafeAreaView>
  );
}
const statusLabel = (status?: string) => {
  if (status === "ON_TRACK") return "On Track ✓";
  if (status === "OVER") return "Over Goal ↑";
  return "Under Goal ↓";
};
