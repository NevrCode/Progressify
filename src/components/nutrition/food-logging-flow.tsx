import { gymStyles } from "@/assets/styles/gym.style";
import { ActionStatus, type ActionFeedback } from "@/components/base/action-status";
import { AppButton } from "@/components/base/app-button";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { FOOD_DIARY_QUERY_KEY } from "@/hooks/useFoodDiary";
import {
  createCustomFood,
  type CustomFoodResponse,
  deleteCustomFood,
  searchCustomFoods,
} from "@/services/customFoodService";
import {
  createFoodEntry,
  type FatSecretFoodDetail,
  findFoodByBarcode,
  type MealType,
} from "@/services/foodDiaryService";
import { useDiscoveryFeed, useToggleDiscoveryFavorite } from "@/services/discoveryService";
import { toApiError } from "@/utils/apiError";
import { rankDiscovery } from "@/utils/discovery-ranking";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BarcodeScannerModal } from "./BarcodeScannerModal";

const mealOptions: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

type FlowFeedback = ActionFeedback & { surface: "single" | "custom" };

type DiscoverableCustomFood = CustomFoodResponse & {
  resource_type: "food";
  resource_id: string;
};

const asDiscoverableCustomFood = (food: CustomFoodResponse): DiscoverableCustomFood => ({
  ...food,
  resource_type: "food",
  resource_id: `custom:${food.id}`,
});

const parseNumber = (value?: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toSelectedFood = (food: CustomFoodResponse): FatSecretFoodDetail => ({
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

/** Owns the complete search -> select/create -> log-food interaction. */
export function FoodLoggingFlow({
  selectedDate,
  openRequest = 0,
}: {
  selectedDate: string;
  /** Increment to request that the internally-owned picker opens. */
  openRequest?: number;
}) {
  const { theme } = useTheme();
  const styles = gymStyles(theme);
  const { alert } = useAlert();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("BREAKFAST");
  const [selectedFood, setSelectedFood] = useState<FatSecretFoodDetail | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [showPicker, setShowPicker] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [feedback, setFeedback] = useState<FlowFeedback | null>(null);
  const [custom, setCustom] = useState({
    name: "",
    servingDescription: "100g",
    grams: "100",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sodium: "",
  });

  useEffect(() => {
    if (openRequest <= 0) return;
    const timer = setTimeout(() => setShowPicker(true), 0);
    return () => clearTimeout(timer);
  }, [openRequest]);

  const closePicker = () => {
    setShowPicker(false);
    setShowManual(false);
    setFeedback(null);
  };
  const selectFood = (food: FatSecretFoodDetail) => {
    setSelectedFood(food);
    setShowPicker(false);
    setQuantity("1");
  };
  const resetCustom = () => {
    setCustom({
      name: "", servingDescription: "100g", grams: "100", calories: "",
      protein: "", carbs: "", fat: "", fiber: "", sodium: "",
    });
    setShowOptionalFields(false);
  };
  const setCustomField = (field: keyof typeof custom, value: string) =>
    setCustom((current) => ({ ...current, [field]: value }));

  const foodSearchQuery = useQuery({
    queryKey: [...FOOD_DIARY_QUERY_KEY, "custom", search.trim()],
    queryFn: () => searchCustomFoods(search.trim()),
  });
  const discoveryQuery = useDiscoveryFeed("food");
  const favoriteMutation = useToggleDiscoveryFavorite("food");
  const rankedFoods = useMemo(() => {
    const matches = (foodSearchQuery.data ?? []).map(asDiscoverableCustomFood);
    const byResourceID = new Map(matches.map((food) => [food.resource_id, food]));
    const resolve = (resourceID: string) => byResourceID.get(resourceID);
    return rankDiscovery(
      (discoveryQuery.data?.favorites ?? []).map((item) => resolve(item.resource_id)).filter(Boolean) as DiscoverableCustomFood[],
      (discoveryQuery.data?.recent ?? []).map((item) => resolve(item.resource_id)).filter(Boolean) as DiscoverableCustomFood[],
      matches,
    );
  }, [discoveryQuery.data, foodSearchQuery.data]);
  const favoriteFoodIDs = useMemo(
    () => new Set((discoveryQuery.data?.favorites ?? []).map((item) => item.resource_id)),
    [discoveryQuery.data],
  );

  const createCustomMutation = useMutation({
    mutationFn: createCustomFood,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: [...FOOD_DIARY_QUERY_KEY, "custom"] });
      resetCustom();
      setShowManual(false);
      if (isOfflineQueuedResponse(saved)) {
        setFeedback({ surface: "custom", status: "info", title: "Custom food saved locally", message: "It will become available for logging after synchronization completes." });
        return;
      }
      selectFood(toSelectedFood(saved));
      setFeedback({ surface: "single", status: "success", title: "Custom food created", message: `${saved.food_name} is selected and ready to log.` });
    },
    onError: (error) => setFeedback({ surface: "custom", status: "error", title: "Could not create custom food", message: toApiError(error).message }),
  });

  const deleteCustomMutation = useMutation({
    mutationFn: deleteCustomFood,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [...FOOD_DIARY_QUERY_KEY, "custom"] });
      const queued = isOfflineQueuedResponse(result);
      setFeedback({
        surface: "custom", status: queued ? "info" : "success",
        title: queued ? "Deletion saved locally" : "Custom food deleted",
        message: queued ? "The custom food will be removed after synchronization." : "The custom food was removed from your library.",
      });
    },
    onError: (error) => setFeedback({ surface: "custom", status: "error", title: "Could not delete custom food", message: toApiError(error).message }),
  });

  const barcodeMutation = useMutation({
    mutationFn: findFoodByBarcode,
    onMutate: () => setFeedback(null),
    onSuccess: (food) => {
      selectFood(food);
      setShowScanner(false);
      setFeedback({ surface: "single", status: "success", title: "Barcode matched", message: `${food.food_name} is selected and ready to log.` });
    },
    onError: (error) => {
      setFeedback({ surface: "custom", status: "error", title: "Barcode lookup failed", message: toApiError(error).message });
      setShowScanner(false);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: async (result) => {
      setSelectedFood(null);
      setSearch("");
      setQuantity("1");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...FOOD_DIARY_QUERY_KEY, "summary", selectedDate] }),
        queryClient.invalidateQueries({ queryKey: [...FOOD_DIARY_QUERY_KEY, "entries"] }),
        queryClient.invalidateQueries({ queryKey: ["diary-summary", selectedDate] }),
      ]);
      const queued = isOfflineQueuedResponse(result);
      setFeedback({ surface: "single", status: queued ? "info" : "success", title: queued ? "Food saved locally" : "Food logged", message: queued ? "The diary entry is pending synchronization in the device queue." : "The entry was added to the selected meal and date." });
    },
    onError: (error) => setFeedback({ surface: "single", status: "error", title: "Could not save food", message: toApiError(error).message || "Please try again." }),
  });

  const serving = selectedFood?.serving;
  const quantityNumber = Math.max(parseNumber(quantity), 0);
  const macros = useMemo(() => ({
    calories: parseNumber(serving?.calories) * quantityNumber,
    protein: parseNumber(serving?.protein) * quantityNumber,
    carbohydrate: parseNumber(serving?.carbohydrate) * quantityNumber,
    fat: parseNumber(serving?.fat) * quantityNumber,
  }), [serving, quantityNumber]);

  const saveSelectedFood = () => {
    if (!selectedFood || !serving) {
      setFeedback({ surface: "single", status: "error", title: "Pick a food first", message: "Search the food database and select a food." });
      return;
    }
    if (quantityNumber <= 0) {
      setFeedback({ surface: "single", status: "error", title: "Quantity needed", message: "Quantity must be greater than 0." });
      return;
    }
    setFeedback(null);
    createEntryMutation.mutate({
      food_id: selectedFood.food_id, food_name: selectedFood.food_name,
      serving_id: serving.serving_id, serving_description: serving.serving_description,
      quantity: quantityNumber, calories: Number(macros.calories.toFixed(1)),
      protein: Number(macros.protein.toFixed(1)), fat: Number(macros.fat.toFixed(1)),
      carbohydrate: Number(macros.carbohydrate.toFixed(1)), date: selectedDate, meal_type: selectedMeal,
    });
  };

  const saveCustomFood = () => {
    const missing = !custom.name.trim() ? "food name" : !custom.calories ? "calories" : !custom.protein ? "protein" : !custom.carbs ? "carbs" : !custom.fat ? "fat" : null;
    if (missing) {
      setFeedback({ surface: "custom", status: "error", title: "Required information", message: `Enter ${missing}.` });
      return;
    }
    setFeedback(null);
    createCustomMutation.mutate({
      food_name: custom.name.trim(), serving_description: custom.servingDescription.trim() || "100g",
      metric_serving_amount: parseFloat(custom.grams) || 100,
      calories: parseFloat(custom.calories), protein: parseFloat(custom.protein),
      carbohydrate: parseFloat(custom.carbs), fat: parseFloat(custom.fat),
      fiber: custom.fiber ? parseFloat(custom.fiber) : undefined,
      sodium: custom.sodium ? parseFloat(custom.sodium) : undefined,
    });
  };

  const renderCustomFood = (food: DiscoverableCustomFood) => {
    const favorite = favoriteFoodIDs.has(food.resource_id);
    return <TouchableOpacity key={food.resource_id} accessibilityRole="button" accessibilityLabel={`Select ${food.food_name}`} style={styles.listCard} onPress={() => selectFood(toSelectedFood(food))}>
      <View style={styles.exerciseHeader}><View style={{ flex: 1 }}><Text style={styles.listTitle}>{food.food_name}</Text><Text style={styles.listMeta}>{food.serving_description || "1 serving"} • {food.calories} kcal</Text><Text style={styles.listSubtle}>P: {food.protein}g • C: {food.carbohydrate}g • F: {food.fat}g</Text></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${favorite ? "Remove" : "Add"} ${food.food_name} ${favorite ? "from" : "to"} favorite foods`} hitSlop={8} onPress={(event) => { event.stopPropagation(); favoriteMutation.mutate({ favorite: !favorite, input: { resource_type: "food", resource_id: food.resource_id, display_name: food.food_name, subtitle: "My food", serving_id: String(food.id), serving_description: food.serving_description ?? "1 serving" } }); }}><MaterialIcons name={favorite ? "star" : "star-border"} size={21} color={favorite ? theme.primary : theme.textLight} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete custom food ${food.food_name}`} hitSlop={8} onPress={(event) => { event.stopPropagation(); alert("Delete Custom Food", "Are you sure you want to delete this custom food?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { setFeedback(null); deleteCustomMutation.mutate(food.id); } }]); }}><MaterialIcons name="delete-outline" size={20} color={theme.expense} /></TouchableOpacity><MaterialIcons name="add-circle-outline" size={22} color={theme.primary} />
        </View>
      </View>
    </TouchableOpacity>;
  };

  return (
    <>
      <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
        <Text style={styles.sectionTitle}>Log Food Now</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Search foods" style={styles.inlineAction} onPress={() => setShowPicker(true)}>
          <MaterialIcons name="search" size={16} color={theme.primary} />
          <Text style={styles.inlineActionText}>Search food</Text>
        </TouchableOpacity>
      </View>
      {feedback?.surface === "single" ? <ActionStatus {...feedback} onDismiss={() => setFeedback(null)} /> : null}
      <ShadowGlowCard style={{ borderColor: theme.primary + "20", borderWidth: 1.5 }}>
        {selectedFood && serving ? <>
          <View style={styles.exerciseHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{selectedFood.food_name}</Text>
              <Text style={styles.exerciseMeta}>{selectedFood.brand_name ?? selectedFood.food_type ?? "-"}</Text>
              <Text style={styles.exerciseSubMeta}>{serving.serving_description ?? "Selected serving"}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Clear selected food ${selectedFood.food_name}`} hitSlop={10} onPress={() => setSelectedFood(null)}>
              <MaterialIcons name="close" size={20} color={theme.textLight} />
            </TouchableOpacity>
          </View>
          <View style={[styles.chipRow, { marginBottom: 12, marginTop: 8, flexWrap: "wrap" }]}>
            {mealOptions.map((meal) => {
              const active = selectedMeal === meal.value;
              return <TouchableOpacity key={meal.value} accessibilityRole="radio" accessibilityLabel={meal.label} accessibilityState={{ selected: active }} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setSelectedMeal(meal.value)}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{meal.label}</Text>
              </TouchableOpacity>;
            })}
          </View>
          <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="Quantity" placeholderTextColor={theme.textLight} value={quantity} onChangeText={setQuantity} />
          <View style={styles.setTable}>
            <View style={styles.setTableHeader}>{["Cal", "Protein", "Carbs", "Fat"].map((label) => <Text key={label} style={styles.setHeaderText}>{label}</Text>)}</View>
            <View style={styles.setRow}>
              <Text style={styles.setValue}>{macros.calories.toFixed(0)}</Text><Text style={styles.setValue}>{macros.protein.toFixed(1)}g</Text>
              <Text style={styles.setValue}>{macros.carbohydrate.toFixed(1)}g</Text><Text style={styles.setValue}>{macros.fat.toFixed(1)}g</Text>
            </View>
          </View>
          <AppButton label="Save to Diary" accessibilityLabel={`Log ${selectedFood.food_name}`} loading={createEntryMutation.isPending} onPress={saveSelectedFood} />
        </> : <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open food search" onPress={() => setShowPicker(true)} activeOpacity={0.8} style={{ paddingVertical: 12, alignItems: "center" }}>
          <Text style={[styles.subEmptyText, { textAlign: "center", color: theme.primary, fontWeight: "600" }]}>Tap here to search and log food directly</Text>
        </TouchableOpacity>}
      </ShadowGlowCard>

      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={closePicker}>
        <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={[styles.modalCard, { maxHeight: "88%" }]}>
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.modalTitle}>{showManual ? "Add Custom Food" : "Find Food"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {!showManual && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Scan a food barcode" hitSlop={10} onPress={() => setShowScanner(true)}><MaterialCommunityIcons name="barcode-scan" size={20} color={theme.primary} /></TouchableOpacity>}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close food search" hitSlop={10} onPress={closePicker}><MaterialIcons name="close" size={22} color={theme.textBlack} /></TouchableOpacity>
            </View>
          </View>
          {feedback?.surface === "custom" ? <ActionStatus {...feedback} onDismiss={() => setFeedback(null)} /> : null}
          {showManual ? <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
            <TextInput style={styles.input} placeholder="Food name *" placeholderTextColor={theme.textLight} value={custom.name} onChangeText={(v) => setCustomField("name", v)} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput style={[styles.input, { flex: 1.2 }]} placeholder="Serving (e.g. 100g)" placeholderTextColor={theme.textLight} value={custom.servingDescription} onChangeText={(v) => setCustomField("servingDescription", v)} />
              <TextInput style={[styles.input, { flex: .8 }]} placeholder="Weight (g)" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={custom.grams} onChangeText={(v) => setCustomField("grams", v)} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Calories *" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={custom.calories} onChangeText={(v) => setCustomField("calories", v)} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Protein (g) *" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={custom.protein} onChangeText={(v) => setCustomField("protein", v)} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Carbs (g) *" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={custom.carbs} onChangeText={(v) => setCustomField("carbs", v)} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Fat (g) *" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={custom.fat} onChangeText={(v) => setCustomField("fat", v)} />
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={showOptionalFields ? "Hide optional nutrition fields" : "Show optional nutrition fields"} accessibilityState={{ expanded: showOptionalFields }} onPress={() => setShowOptionalFields((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginVertical: 4 }}>
              <MaterialIcons name={showOptionalFields ? "expand-less" : "expand-more"} size={16} color={theme.primary} /><Text style={{ fontSize: 12, fontWeight: "700", color: theme.primary, fontFamily: "PlusJakartaSans_700Bold" }}>{showOptionalFields ? "Hide Optional" : "Add Fiber & Sodium"}</Text>
            </TouchableOpacity>
            {showOptionalFields && <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Fiber (g)" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={custom.fiber} onChangeText={(v) => setCustomField("fiber", v)} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Sodium (mg)" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={custom.sodium} onChangeText={(v) => setCustomField("sodium", v)} />
            </View>}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <AppButton label="Cancel" onPress={() => { setShowManual(false); setFeedback(null); }} style={{ flex: 1 }} variant="secondary" />
              <AppButton label="Save & Log Food" loading={createCustomMutation.isPending} style={{ flex: 2 }} onPress={saveCustomFood} />
            </View>
          </ScrollView> : <>
            <TextInput style={styles.input} placeholder="Search custom foods..." placeholderTextColor={theme.textLight} value={search} onChangeText={setSearch} autoFocus />
            <AppButton label="Create New Custom Food" onPress={() => { setFeedback(null); setShowManual(true); }} style={{ marginBottom: 12 }} variant="secondary" />
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {!foodSearchQuery.isFetching ? <>
                {rankedFoods.favorites.length ? <View style={{ gap: 8 }}><Text style={{ color: theme.textLight, fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: .6, textTransform: "uppercase", marginTop: 4 }}>Favorites</Text>{rankedFoods.favorites.map(renderCustomFood)}</View> : null}
                {rankedFoods.recent.length ? <View style={{ gap: 8 }}><Text style={{ color: theme.textLight, fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: .6, textTransform: "uppercase", marginTop: 4 }}>Recent</Text>{rankedFoods.recent.map(renderCustomFood)}</View> : null}
                {rankedFoods.matches.length ? <View style={{ gap: 8 }}><Text style={{ color: theme.textLight, fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: .6, textTransform: "uppercase", marginTop: 4 }}>{search ? "Matches" : "All foods"}</Text>{rankedFoods.matches.map(renderCustomFood)}</View> : null}
              </> : null}
              {foodSearchQuery.isFetching ? <View style={styles.loadingState}><ActivityIndicator color={theme.primary} /><Text style={styles.loadingText}>Searching custom foods...</Text></View>
                : showManual ? foodSearchQuery.data?.map((food) => <TouchableOpacity key={food.id} accessibilityRole="button" accessibilityLabel={`Select ${food.food_name}`} style={styles.listCard} onPress={() => selectFood(toSelectedFood(food))}>
                  <View style={styles.exerciseHeader}><View style={{ flex: 1 }}><Text style={styles.listTitle}>{food.food_name}</Text><Text style={styles.listMeta}>{food.serving_description || "1 serving"} • {food.calories} kcal</Text><Text style={styles.listSubtle}>P: {food.protein}g • C: {food.carbohydrate}g • F: {food.fat}g</Text></View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete custom food ${food.food_name}`} hitSlop={8} onPress={(event) => { event.stopPropagation(); alert("Delete Custom Food", "Are you sure you want to delete this custom food?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { setFeedback(null); deleteCustomMutation.mutate(food.id); } }]); }}><MaterialIcons name="delete-outline" size={20} color={theme.expense} /></TouchableOpacity><MaterialIcons name="add-circle-outline" size={22} color={theme.primary} /></View>
                  </View>
                </TouchableOpacity>) : rankedFoods.favorites.length || rankedFoods.recent.length || rankedFoods.matches.length ? null : <Text style={styles.emptyText}>{search ? "No custom foods found." : "No custom foods created yet."}</Text>}
            </ScrollView>
          </>}
        </View></View>
      </Modal>
      <BarcodeScannerModal visible={showScanner} onClose={() => setShowScanner(false)} onScanned={(barcode) => barcodeMutation.mutate(barcode)} isLoading={barcodeMutation.isPending} />
    </>
  );
}
