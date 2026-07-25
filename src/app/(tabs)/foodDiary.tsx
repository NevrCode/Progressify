import { gymStyles } from "@/assets/styles/gym.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { AppButton } from "@/components/base/app-button";
import { DateNavigator } from "@/components/base/date-navigator";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { PageHeader } from "@/components/base/page-header";
import { SegmentedControl } from "@/components/base/segmented-control";
import { SelectionCard } from "@/components/base/selection-card";
import { StatePanel } from "@/components/base/state-panel";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { BarcodeScannerModal } from "@/components/nutrition/BarcodeScannerModal";
import {
  FoodDiaryInitialSkeleton,
  FoodEntriesSkeleton,
  IntakeSummarySkeleton,
} from "@/components/nutrition/food-diary-skeletons";
import { MealPrepSection } from "@/components/nutrition/mealPrepSection";
import { ThemeType } from "@/constants/colors";
import {
  getNutritionAccents,
  getThemeSemantics,
} from "@/constants/semantic-colors";
import { FONT_FAMILIES } from "@/constants/typography";
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
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

const mealOptions: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

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

const getEntryFoodName = (entry: FoodEntryDetailResponseDTO) =>
  String(getEntryValue(entry, "food_name", "foodName") ?? "Food");

const statusColor = (status: string | undefined, theme: ThemeType) => {
  const semantics = getThemeSemantics(theme);
  if (status === "ON_TRACK") return semantics.success;
  if (status === "OVER") return semantics.danger;
  return theme.textLight;
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
              fontFamily: FONT_FAMILIES.semibold,
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

      <IconButton
        accessibilityLabel={`Delete ${entry.food_name || "food entry"}`}
        variant="destructive"
        onPress={() => onDelete(entry)}
        icon={
          <MaterialIcons
            name="delete-outline"
            size={17}
            color={theme.expense ?? "#A32D2D"}
          />
        }
      />
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
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.textLight,
                    fontFamily: FONT_FAMILIES.semibold,
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
  const [search, setSearch] = useState("");
  const [openMoreMacros, setOpenMoreMacros] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("BREAKFAST");
  const [selectedFood, setSelectedFood] = useState<FatSecretFoodDetail | null>(
    null,
  );
  const [quantity, setQuantity] = useState("1");
  const [showFoodPicker, setShowFoodPicker] = useState(false);
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
  const [foodActionFeedback, setFoodActionFeedback] =
    useState<ScopedFoodActionFeedback | null>(null);

  const resetCustomFoodForm = () => {
    setCustomName("");
    setCustomServingDesc("100g");
    setCustomGramation("100");
    setCustomCalories("");
    setCustomProtein("");
    setCustomCarbs("");
    setCustomFat("");
    setCustomFiber("");
    setCustomSodium("");
    setShowOptionalFields(false);
  };

  const createCustomFoodMutation = useMutation({
    mutationFn: createCustomFood,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "custom"],
      });
      resetCustomFoodForm();
      setShowManual(false);
      if (isOfflineQueuedResponse(saved)) {
        setFoodActionFeedback({
          surface: "custom",
          status: "info",
          title: "Custom food saved locally",
          message:
            "It will become available for logging after synchronization completes.",
        });
        return;
      }
      handleSelectCustomFood(saved);
      setFoodActionFeedback({
        surface: "single",
        status: "success",
        title: "Custom food created",
        message: `${saved.food_name} is selected and ready to log.`,
      });
    },
    onError: (error) => {
      setFoodActionFeedback({
        surface: "custom",
        status: "error",
        title: "Could not create custom food",
        message: toApiError(error).message,
      });
    },
  });

  const deleteCustomFoodMutation = useMutation({
    mutationFn: deleteCustomFood,
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [...FOOD_DIARY_QUERY_KEY, "custom"],
      });
      const queued = isOfflineQueuedResponse(result);
      setFoodActionFeedback({
        surface: "custom",
        status: queued ? "info" : "success",
        title: queued ? "Deletion saved locally" : "Custom food deleted",
        message: queued
          ? "The custom food will be removed after synchronization."
          : "The custom food was removed from your library.",
      });
    },
    onError: (error) => {
      setFoodActionFeedback({
        surface: "custom",
        status: "error",
        title: "Could not delete custom food",
        message: toApiError(error).message,
      });
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
          onPress: () => {
            setFoodActionFeedback(null);
            deleteCustomFoodMutation.mutate(id);
          },
        },
      ],
    );
  };

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const barcodeScanMutation = useMutation({
    mutationFn: findFoodByBarcode,
    onMutate: () => setFoodActionFeedback(null),
    onSuccess: (food) => {
      setSelectedFood(food);
      setShowBarcodeScanner(false);
      setShowFoodPicker(false);
      setQuantity("1");
      setFoodActionFeedback({
        surface: "single",
        status: "success",
        title: "Barcode matched",
        message: `${food.food_name} is selected and ready to log.`,
      });
    },
    onError: (error: any) => {
      setFoodActionFeedback({
        surface: "custom",
        status: "error",
        title: "Barcode lookup failed",
        message: toApiError(error).message,
      });
      setShowBarcodeScanner(false);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: async (result) => {
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
      setFoodActionFeedback({
        surface: "single",
        status: isOfflineQueuedResponse(result) ? "info" : "success",
        title: isOfflineQueuedResponse(result)
          ? "Food saved locally"
          : "Food logged",
        message: isOfflineQueuedResponse(result)
          ? "The diary entry is pending synchronization in the device queue."
          : "The entry was added to the selected meal and date.",
      });
    },
    onError: (error) => {
      setFoodActionFeedback({
        surface: "single",
        status: "error",
        title: "Could not save food",
        message: toApiError(error).message || "Please try again.",
      });
    },
  });

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

  const isRefreshing =
    !summaryLoading && !entriesLoading && (summaryFetching || entriesFetching);

  const refreshDiary = () => {
    refetchSummary();
    refetchEntries();
    refetchTodayDiarySummary();
  };

  const saveSelectedFood = () => {
    if (!selectedFood || !serving) {
      setFoodActionFeedback({
        surface: "single",
        status: "error",
        title: "Pick a food first",
        message: "Search the food database and select a food.",
      });
      return;
    }

    if (quantityNumber <= 0) {
      setFoodActionFeedback({
        surface: "single",
        status: "error",
        title: "Quantity needed",
        message: "Quantity must be greater than 0.",
      });
      return;
    }

    setFoodActionFeedback(null);
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
          <PageHeader eyebrow="Nutrition" title="Food Diary" />

          {foodActionFeedback?.surface === "page" ? (
            <ActionStatus
              {...foodActionFeedback}
              onDismiss={() => setFoodActionFeedback(null)}
            />
          ) : null}

          <DateNavigator
            label={
              selectedDate === formatDateForApi(new Date())
                ? "Today"
                : formatDateLabel(selectedDate)
            }
            supportingLabel="Tap to reset date"
            onPrevious={() => setSelectedDate(addDays(selectedDate, -1))}
            onNext={() => setSelectedDate(addDays(selectedDate, 1))}
            onLabelPress={() => setSelectedDate(formatDateForApi(new Date()))}
          />

          {profileLoading && <FoodDiaryInitialSkeleton />}

          {hasProfile && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: theme.card,
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
                    fontSize: 11,
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
                    fontSize: 11,
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
                    fontSize: 11,
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
                    fontSize: 11,
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
                  <AppButton
                    label="Next"
                    onPress={() => setStep(1)}
                  />
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
                    message="Log your first food to start today’s calorie and macro summary."
                    primaryAction={{
                      label: "Search food",
                      onPress: () => setShowFoodPicker(true),
                    }}
                  />
                )}
              </ShadowGlowCard>

              {/* Today's Food Entries Section */}
              <ShadowGlowCard
                style={{
                  marginTop: 16,
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
                  <FoodEntriesSkeleton />
                ) : todayDairySummary?.entries &&
                  todayDairySummary.entries.length > 0 ? (
                  <FoodEntriesByMeal
                    entries={todayDairySummary.entries}
                    onDelete={confirmDeleteEntry}
                    theme={theme}
                    style={styles}
                  />
                ) : (
                  <StatePanel
                    variant="empty"
                    compact
                    embedded
                    title="No meals logged today"
                    message="Foods added today will be grouped here by meal."
                    primaryAction={{
                      label: "Add food",
                      onPress: () => setShowFoodPicker(true),
                    }}
                  />
                )}
              </ShadowGlowCard>
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

          {hasProfile &&
            !formOpen &&
            !overrideOpen &&
            activeTab === "SINGLE" && (
              <>
                <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                  <Text style={styles.sectionTitle}>Log Food Now</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Search foods"
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

                {foodActionFeedback?.surface === "single" ? (
                  <ActionStatus
                    {...foodActionFeedback}
                    onDismiss={() => setFoodActionFeedback(null)}
                  />
                ) : null}

                <ShadowGlowCard
                  style={{
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
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Clear selected food ${selectedFood.food_name}`}
                          hitSlop={10}
                          onPress={() => setSelectedFood(null)}
                        >
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
                              accessibilityRole="radio"
                              accessibilityLabel={meal.label}
                              accessibilityState={{ selected: active }}
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

                      <AppButton
                        label="Save to Diary"
                        accessibilityLabel={`Log ${selectedFood.food_name}`}
                        loading={createEntryMutation.isPending}
                        onPress={saveSelectedFood}
                      />
                    </>
                  ) : (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Open food search"
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
        </TabScreenScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showFoodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowFoodPicker(false);
          setShowManual(false);
          setFoodActionFeedback(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            accessibilityViewIsModal
            style={[styles.modalCard, { maxHeight: "88%" }]}
          >
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                {showManual ? "Add Custom Food" : "Find Food"}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                {!showManual && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Scan a food barcode"
                    hitSlop={10}
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
                  accessibilityRole="button"
                  accessibilityLabel="Close food search"
                  hitSlop={10}
                  onPress={() => {
                    setShowFoodPicker(false);
                    setShowManual(false);
                    setFoodActionFeedback(null);
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

            {foodActionFeedback?.surface === "custom" ? (
              <ActionStatus
                {...foodActionFeedback}
                onDismiss={() => setFoodActionFeedback(null)}
              />
            ) : null}

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
                  accessibilityRole="button"
                  accessibilityLabel={
                    showOptionalFields
                      ? "Hide optional nutrition fields"
                      : "Show optional nutrition fields"
                  }
                  accessibilityState={{ expanded: showOptionalFields }}
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
                  <AppButton
                    label="Cancel"
                    onPress={() => {
                      setShowManual(false);
                      setFoodActionFeedback(null);
                    }}
                    style={{ flex: 1 }}
                    variant="secondary"
                  />
                  <AppButton
                    label="Save & Log Food"
                    loading={createCustomFoodMutation.isPending}
                    style={{ flex: 2 }}
                    onPress={() => {
                      const missingField = !customName.trim()
                        ? "food name"
                        : !customCalories
                          ? "calories"
                          : !customProtein
                            ? "protein"
                            : !customCarbs
                              ? "carbs"
                              : !customFat
                                ? "fat"
                                : null;
                      if (missingField) {
                        setFoodActionFeedback({
                          surface: "custom",
                          status: "error",
                          title: "Required information",
                          message: `Enter ${missingField}.`,
                        });
                        return;
                      }
                      setFoodActionFeedback(null);
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
                  />
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

                <AppButton
                  label="Create New Custom Food"
                  onPress={() => {
                    setFoodActionFeedback(null);
                    setShowManual(true);
                  }}
                  style={{ marginBottom: 12 }}
                  variant="secondary"
                />

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
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${food.food_name}`}
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
                              accessibilityRole="button"
                              accessibilityLabel={`Delete custom food ${food.food_name}`}
                              hitSlop={8}
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
