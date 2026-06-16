import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import {
    FOOD_DIARY_QUERY_KEY,
    useFoodDiarySummary,
    useFoodEntries,
} from "@/hooks/useFoodDiary";
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
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
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
    getEntryValue(entry, "entry_date", "entryDate") ??
      entry.date ??
      entry.created_at ??
      "",
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
export default function MealSettings() {
  const { theme } = useTheme();
  const style = gymStyles(theme);
  const queryClient = useQueryClient();
  const [gramation, setGramation] = useState("0");

  const [selectedDate, setSelectedDate] = useState(
    formatDateForApi(new Date()),
  );
  const [search, setSearch] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("BREAKFAST");
  const [selectedFood, setSelectedFood] = useState<FatSecretFoodDetail | null>(
    null,
  );
  const [quantity, setQuantity] = useState("1");
  const [showFoodPicker, setShowFoodPicker] = useState(false);

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
      setGramation(
        String(parseNumber(food.serving?.metric_serving_amount) || 100),
      );
      setShowFoodPicker(false);
      setQuantity("1");
    },
    onError: (error: any) => {
      Alert.alert("Food detail failed", error.message || "Try another food.");
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
      Alert.alert("Could not save food", error.message || "Please try again.");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: deleteFoodEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FOOD_DIARY_QUERY_KEY });
    },
    onError: (error: any) => {
      Alert.alert("Delete failed", error.message || "Please try again.");
    },
  });

  const serving = selectedFood?.serving;
  const quantityNumber = Math.max(parseNumber(quantity), 0);
  const gramationNumber = Math.max(parseNumber(gramation), 0);
  const selectedMacros = useMemo(() => {
    const baseAmount = parseNumber(serving?.metric_serving_amount) || 100;
    const ratio = gramationNumber / baseAmount;
    return {
      calories: parseNumber(serving?.calories) * ratio,
      protein: parseNumber(serving?.protein) * ratio,
      carbohydrate: parseNumber(serving?.carbohydrate) * ratio,
      fat: parseNumber(serving?.fat) * ratio,
    };
  }, [serving, gramationNumber]);

  const summaryMacros = {
    calories: getSummaryMacro(summary, "total_calories", "calories"),
    protein: getSummaryMacro(summary, "total_protein", "protein"),
    carbohydrate: getSummaryMacro(
      summary,
      "total_carbohydrate",
      "carbohydrate",
    ),
    fat: getSummaryMacro(summary, "total_fat", "fat"),
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
  };

  const saveSelectedFood = () => {
    if (!selectedFood || !serving) {
      Alert.alert("Pick a food first", "Search FatSecret and select a food.");
      return;
    }

    if (quantityNumber <= 0) {
      Alert.alert("Quantity needed", "Quantity must be greater than 0.");
      return;
    }
    console.log({
      date: selectedDate,
      meal_type: selectedMeal,
      food_id: selectedFood.food_id,
      serving_id: serving.serving_id,
      food_name: selectedFood.food_name,
      serving_description: serving.serving_description,
      quantity: quantityNumber,
      calories: Number(selectedMacros.calories.toFixed(1)),
      protein: Number(selectedMacros.protein.toFixed(1)),
      carbohydrate: Number(selectedMacros.carbohydrate.toFixed(1)),
      fat: Number(selectedMacros.fat.toFixed(1)),
    });

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
    Alert.alert(
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

  return (
    <SafeAreaView style={style.safeArea}>
      <KeyboardAvoidingView>
        <ScrollView
          contentContainerStyle={style.container}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshDiary}
            />
          }
        >
          <View style={style.header}>
            <View>
              <Text style={style.eyebrow}>Meal Preps</Text>
              <Text style={style.title}>Food Selections</Text>
            </View>
          </View>
          <View style={style.exerciseCard}>
            <View style={style.sectionHeader}>
              <Text style={style.sectionTitle}>Daily Calories Needed</Text>
            </View>
            <View style={style.heroStats}>
              <View style={style.heroStat}>
                <Text style={style.heroStatLabel}>Calories</Text>
                <View>
                  <Text style={style.heroStatValue}>
                    {/* {(1700 - summaryMacros.calories).toFixed(0)} kcal */}
                  </Text>
                  {/* {summaryMacros.calories.toFixed(0) !== "0" && (
                    <Text style={style.heroCalorieStatLabelLowerCase}>
                      (- {summaryMacros.calories.toFixed(0)} kcal)
                    </Text>
                  )} */}
                </View>
              </View>
              <View style={style.heroDivider} />
              <View style={style.heroStat}>
                <Text style={style.heroStatLabel}>Protein</Text>
                <View>
                  <Text style={style.heroStatValue}>
                    {/* {(120 - summaryMacros.protein).toFixed(0)} g */}
                  </Text>
                  {/* {summaryMacros.protein.toFixed(0) !== "0" && (
                    <Text style={style.heroCalorieStatLabelLowerCase}>
                      (- {summaryMacros.protein.toFixed(0)} g)
                    </Text>
                  )} */}
                </View>
              </View>
            </View>
          </View>
          <View style={style.sectionHeader}>
            <Text style={style.sectionTitle}>Add what you ate</Text>
            <TouchableOpacity
              style={style.inlineAction}
              onPress={() => setShowFoodPicker(true)}
            >
              <MaterialIcons name="search" size={16} color={theme.primary} />
              <Text style={style.inlineActionText}>Search food</Text>
            </TouchableOpacity>
          </View>
          <View style={style.exerciseCard}>
            {selectedFood && serving ? (
              <>
                <View style={style.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={style.exerciseName}>
                      {selectedFood.food_name}
                    </Text>
                    <Text style={style.exerciseMeta}>
                      {selectedFood.brand_name ?? selectedFood.food_type ?? "-"}
                    </Text>
                    <Text style={style.exerciseSubMeta}>
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

                <View style={style.chipRow}>
                  {mealOptions.map((meal) => {
                    const active = selectedMeal === meal.value;
                    return (
                      <TouchableOpacity
                        key={meal.value}
                        style={[
                          style.filterChip,
                          active && style.filterChipActive,
                        ]}
                        onPress={() => setSelectedMeal(meal.value)}
                      >
                        <Text
                          style={[
                            style.filterChipText,
                            active && style.filterChipTextActive,
                          ]}
                        >
                          {meal.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={style.input}
                  keyboardType="decimal-pad"
                  placeholder="gramation (g)"
                  placeholderTextColor={theme.textLight}
                  value={gramation}
                  onChangeText={setGramation}
                />

                <View style={style.setTable}>
                  <View style={style.setTableHeader}>
                    <Text style={style.setHeaderText}>Cal</Text>
                    <Text style={style.setHeaderText}>Protein</Text>
                    <Text style={style.setHeaderText}>Carbs</Text>
                    <Text style={style.setHeaderText}>Fat</Text>
                  </View>
                  <View style={style.setRow}>
                    <Text style={style.setValue}>
                      {selectedMacros.calories.toFixed(0)}
                    </Text>
                    <Text style={style.setValue}>
                      {selectedMacros.protein.toFixed(1)}g
                    </Text>
                    <Text style={style.setValue}>
                      {selectedMacros.carbohydrate.toFixed(1)}g
                    </Text>
                    <Text style={style.setValue}>
                      {selectedMacros.fat.toFixed(1)}g
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={style.primaryButton}
                  onPress={saveSelectedFood}
                  disabled={createEntryMutation.isPending}
                >
                  {createEntryMutation.isPending ? (
                    <ActivityIndicator color={theme.white} />
                  ) : (
                    <Text style={style.primaryButtonText}>Save to Diary</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={style.subEmptyCard}>
                <Text style={style.subEmptyText}>
                  Search FatSecret, select a food, then save it to this day.
                </Text>
              </View>
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
        <View style={style.modalBackdrop}>
          <View style={[style.modalCard, { maxHeight: "78%" }]}>
            <View style={style.modalHeader}>
              <Text style={style.modalTitle}>Find Food</Text>
              <TouchableOpacity onPress={() => setShowFoodPicker(false)}>
                <MaterialIcons name="close" size={22} color={theme.textBlack} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={style.input}
              placeholder="Chicken rice, banana, milk..."
              placeholderTextColor={theme.textLight}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />

            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {foodSearchQuery.isFetching ? (
                <View style={style.loadingState}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={style.loadingText}>Searching foods...</Text>
                </View>
              ) : search.trim().length < 2 ? (
                <Text style={style.emptyText}>
                  Type at least 2 characters to search FatSecret.
                </Text>
              ) : foodSearchQuery.data?.length ? (
                foodSearchQuery.data.map((food) => (
                  <TouchableOpacity
                    key={food.food_id}
                    style={style.listCard}
                    activeOpacity={0.82}
                    onPress={() => foodDetailMutation.mutate(food)}
                    disabled={foodDetailMutation.isPending}
                  >
                    <View style={style.exerciseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={style.listTitle}>{food.food_name}</Text>
                        <Text style={style.listMeta}>
                          {food.brand_name ?? food.food_type ?? "-"}
                        </Text>
                        {!!food.food_description && (
                          <Text style={style.listSubtle}>
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
                <Text style={style.emptyText}>
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
