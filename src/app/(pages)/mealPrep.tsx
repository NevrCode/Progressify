import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import {
    useCreateMealPrep,
    useDeleteMealPrep,
    useLogMealPrep,
    useMealPreps,
    useUpdateMealPrep,
} from "@/hooks/useMealPrep";
import {
    FatSecretFoodDetail,
    FatSecretSearchFood,
    getFatSecretFood,
    MealType,
    searchFatSecretFoods,
} from "@/services/foodDiaryService";
import {
    MealPrepItemRequest,
    MealPrepResponse,
} from "@/services/mealPrepService";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
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

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftItem = MealPrepItemRequest & { key: string };

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

const toEpochDay = (dateStr: string) => {
  const ms = new Date(`${dateStr}T00:00:00`).getTime();
  return Math.floor(ms / 86400000);
};

const parseNumber = (value?: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MealPrepScreen() {
  const { theme } = useTheme();
  const style = gymStyles(theme);

  // ── List state ──────────────────────────────────────────────────────────────
  const {
    data: mealPrepsPage,
    isLoading,
    isFetching,
    refetch,
  } = useMealPreps();
  const mealPreps = mealPrepsPage?.data ?? [];

  // ── Expanded card ───────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── Create / Edit form ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrep, setEditingPrep] = useState<MealPrepResponse | null>(null);
  const [prepName, setPrepName] = useState("");
  const [prepDesc, setPrepDesc] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  // ── Food search modal ───────────────────────────────────────────────────────
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null); // null = adding new

  // ── Log to diary modal ──────────────────────────────────────────────────────
  const [showLogModal, setShowLogModal] = useState(false);
  const [logTargetId, setLogTargetId] = useState<number | null>(null);
  const [logDate, setLogDate] = useState(formatDateForApi(new Date()));
  const [logMeal, setLogMeal] = useState<MealType>("LUNCH");

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useCreateMealPrep();
  const updateMutation = useUpdateMealPrep();
  const deleteMutation = useDeleteMealPrep();
  const logMutation = useLogMealPrep();

  const foodSearchQuery = useQuery({
    queryKey: ["fatsecret-search", search.trim()],
    queryFn: () => searchFatSecretFoods(search),
    enabled: search.trim().length >= 2,
  });

  const foodDetailMutation = useMutation({
    mutationFn: (food: FatSecretSearchFood) => getFatSecretFood(food.food_id),
    onSuccess: (food: FatSecretFoodDetail) => {
      const serving = food.serving;
      const baseAmount = parseNumber(serving?.metric_serving_amount) || 100;

      const newItem: DraftItem = {
        key: Date.now().toString(),
        food_id: food.food_id,
        food_name: food.food_name,
        serving_id: serving?.serving_id,
        serving_description: serving?.serving_description,
        gramation: baseAmount,
        calories: parseNumber(serving?.calories),
        protein: parseNumber(serving?.protein),
        fat: parseNumber(serving?.fat),
        carbohydrate: parseNumber(serving?.carbohydrate),
      };

      if (editingItemKey) {
        // Replace existing item
        setDraftItems((prev) =>
          prev.map((i) => (i.key === editingItemKey ? newItem : i)),
        );
        setEditingItemKey(null);
      } else {
        setDraftItems((prev) => [...prev, newItem]);
      }

      setShowFoodPicker(false);
      setSearch("");
    },
    onError: (error: any) => Alert.alert("Food detail failed", error.message),
  });

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingPrep(null);
    setPrepName("");
    setPrepDesc("");
    setDraftItems([]);
    setFormOpen(true);
  };

  const openEdit = (prep: MealPrepResponse) => {
    setEditingPrep(prep);
    setPrepName(prep.name);
    setPrepDesc(prep.description ?? "");
    setDraftItems(
      prep.items.map((i) => ({
        key: String(i.id),
        food_id: i.food_id,
        food_name: i.food_name,
        serving_id: i.serving_id,
        serving_description: i.serving_description,
        gramation: i.gramation,
        calories: i.calories,
        protein: i.protein,
        fat: i.fat,
        carbohydrate: i.carbohydrate,
      })),
    );
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingPrep(null);
    setDraftItems([]);
  };

  const updateItemGramation = (key: string, raw: string) => {
    const grams = Math.max(parseNumber(raw), 0);
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const base = parseNumber(item.gramation) || 100;
        // recalculate macros proportionally from stored base
        const ratio = grams / base;
        return {
          ...item,
          gramation: grams,
          calories: parseNumber(item.calories)
            ? parseNumber(item.calories) * ratio
            : item.calories,
          protein: parseNumber(item.protein)
            ? parseNumber(item.protein) * ratio
            : item.protein,
          fat: parseNumber(item.fat) ? parseNumber(item.fat) * ratio : item.fat,
          carbohydrate: parseNumber(item.carbohydrate)
            ? parseNumber(item.carbohydrate) * ratio
            : item.carbohydrate,
        };
      }),
    );
  };

  const removeItem = (key: string) =>
    setDraftItems((prev) => prev.filter((i) => i.key !== key));

  const totalMacros = useMemo(
    () => ({
      calories: draftItems.reduce((s, i) => s + parseNumber(i.calories), 0),
      protein: draftItems.reduce((s, i) => s + parseNumber(i.protein), 0),
      fat: draftItems.reduce((s, i) => s + parseNumber(i.fat), 0),
      carbohydrate: draftItems.reduce(
        (s, i) => s + parseNumber(i.carbohydrate),
        0,
      ),
    }),
    [draftItems],
  );

  const savePrep = () => {
    if (!prepName.trim())
      return Alert.alert("Name required", "Give your meal prep a name.");
    if (draftItems.length === 0)
      return Alert.alert("Add foods", "Add at least one food item.");

    const dto = {
      name: prepName.trim(),
      description: prepDesc.trim() || undefined,
      items: draftItems,
    };

    if (editingPrep) {
      updateMutation.mutate(
        { id: editingPrep.id, dto },
        {
          onSuccess: closeForm,
          onError: (e: any) => Alert.alert("Update failed", e.message),
        },
      );
    } else {
      createMutation.mutate(dto, {
        onSuccess: closeForm,
        onError: (e: any) => Alert.alert("Create failed", e.message),
      });
    }
  };

  const confirmDelete = (prep: MealPrepResponse) =>
    Alert.alert("Delete meal prep", `Remove "${prep.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(prep.id),
      },
    ]);

  const openLogModal = (id: number) => {
    setLogTargetId(id);
    setLogDate(formatDateForApi(new Date()));
    setLogMeal("LUNCH");
    setShowLogModal(true);
  };

  const confirmLog = () => {
    if (!logTargetId) return;
    logMutation.mutate(
      {
        id: logTargetId,
        dto: { date: toEpochDay(logDate), meal_type: logMeal },
      },
      {
        onSuccess: () => {
          setShowLogModal(false);
          Alert.alert("Logged!", "Meal prep added to your diary.");
        },
        onError: (e: any) => Alert.alert("Log failed", e.message),
      },
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={style.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={style.container}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
        >
          {/* Header */}
          <View style={style.header}>
            <View>
              <Text style={style.eyebrow}>Nutrition</Text>
              <Text style={style.title}>Meal Preps</Text>
            </View>
            <TouchableOpacity style={style.inlineAction} onPress={openCreate}>
              <MaterialIcons name="add" size={16} color={theme.primary} />
              <Text style={style.inlineActionText}>New Prep</Text>
            </TouchableOpacity>
          </View>

          {/* ── CREATE / EDIT FORM (expand/collapse) ────────────────────────── */}
          {formOpen && (
            <View style={style.exerciseCard}>
              <View style={style.sectionHeader}>
                <Text style={style.sectionTitle}>
                  {editingPrep ? "Edit Prep" : "New Meal Prep"}
                </Text>
                <TouchableOpacity onPress={closeForm}>
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={theme.textLight}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={style.input}
                placeholder="Prep name (e.g. Bulk Day)"
                placeholderTextColor={theme.textLight}
                value={prepName}
                onChangeText={setPrepName}
              />
              <TextInput
                style={style.input}
                placeholder="Description (optional)"
                placeholderTextColor={theme.textLight}
                value={prepDesc}
                onChangeText={setPrepDesc}
              />

              {/* Draft items */}
              {draftItems.length > 0 && (
                <View style={{ gap: 8, marginBottom: 8 }}>
                  {draftItems.map((item) => (
                    <View key={item.key} style={style.listCard}>
                      <View style={style.exerciseHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={style.listTitle}>{item.food_name}</Text>
                          <Text style={style.listMeta}>
                            {item.serving_description}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingItemKey(item.key);
                            setShowFoodPicker(true);
                          }}
                        >
                          <MaterialIcons
                            name="edit"
                            size={18}
                            color={theme.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeItem(item.key)}
                          style={{ marginLeft: 8 }}
                        >
                          <MaterialIcons
                            name="delete-outline"
                            size={18}
                            color={theme.expense ?? "#e74c3c"}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Gramation input */}
                      <TextInput
                        style={[style.input, { marginTop: 6 }]}
                        keyboardType="decimal-pad"
                        placeholder="Gramation (g)"
                        placeholderTextColor={theme.textLight}
                        value={String(item.gramation)}
                        onChangeText={(v) => updateItemGramation(item.key, v)}
                      />

                      {/* Macros row */}
                      <View style={style.setTable}>
                        <View style={style.setTableHeader}>
                          <Text style={style.setHeaderText}>Cal</Text>
                          <Text style={style.setHeaderText}>Protein</Text>
                          <Text style={style.setHeaderText}>Carbs</Text>
                          <Text style={style.setHeaderText}>Fat</Text>
                        </View>
                        <View style={style.setRow}>
                          <Text style={style.setValue}>
                            {parseNumber(item.calories).toFixed(0)}
                          </Text>
                          <Text style={style.setValue}>
                            {parseNumber(item.protein).toFixed(1)}g
                          </Text>
                          <Text style={style.setValue}>
                            {parseNumber(item.carbohydrate).toFixed(1)}g
                          </Text>
                          <Text style={style.setValue}>
                            {parseNumber(item.fat).toFixed(1)}g
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Total macros */}
              {draftItems.length > 0 && (
                <View style={[style.exerciseCard, { marginBottom: 8 }]}>
                  <Text style={style.sectionTitle}>Total</Text>
                  <View style={style.heroStats}>
                    <View style={style.heroStat}>
                      <Text style={style.heroStatLabel}>Calories</Text>
                      <Text style={style.heroStatValue}>
                        {totalMacros.calories.toFixed(0)}
                      </Text>
                    </View>
                    <View style={style.heroDivider} />
                    <View style={style.heroStat}>
                      <Text style={style.heroStatLabel}>Protein</Text>
                      <Text style={style.heroStatValue}>
                        {totalMacros.protein.toFixed(1)}g
                      </Text>
                    </View>
                    <View style={style.heroDivider} />
                    <View style={style.heroStat}>
                      <Text style={style.heroStatLabel}>Carbs</Text>
                      <Text style={style.heroStatValue}>
                        {totalMacros.carbohydrate.toFixed(1)}g
                      </Text>
                    </View>
                    <View style={style.heroDivider} />
                    <View style={style.heroStat}>
                      <Text style={style.heroStatLabel}>Fat</Text>
                      <Text style={style.heroStatValue}>
                        {totalMacros.fat.toFixed(1)}g
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Add food button */}
              <TouchableOpacity
                style={style.inlineAction}
                onPress={() => {
                  setEditingItemKey(null);
                  setShowFoodPicker(true);
                }}
              >
                <MaterialIcons name="search" size={16} color={theme.primary} />
                <Text style={style.inlineActionText}>Add Food</Text>
              </TouchableOpacity>

              {/* Save button */}
              <TouchableOpacity
                style={[style.primaryButton, { marginTop: 12 }]}
                onPress={savePrep}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text style={style.primaryButtonText}>
                    {editingPrep ? "Save Changes" : "Create Meal Prep"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── MEAL PREP LIST ───────────────────────────────────────────────── */}
          {isLoading ? (
            <ActivityIndicator
              color={theme.primary}
              style={{ marginTop: 32 }}
            />
          ) : mealPreps.length === 0 ? (
            <View style={style.subEmptyCard}>
              <Text style={style.subEmptyText}>
                No meal preps yet. Create one above!
              </Text>
            </View>
          ) : (
            mealPreps.map((prep) => {
              const expanded = expandedId === prep.id;
              return (
                <View key={prep.id} style={style.exerciseCard}>
                  {/* Card header */}
                  <TouchableOpacity
                    style={style.exerciseHeader}
                    onPress={() => setExpandedId(expanded ? null : prep.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={style.exerciseName}>{prep.name}</Text>
                      {!!prep.description && (
                        <Text style={style.exerciseMeta}>
                          {prep.description}
                        </Text>
                      )}
                      <Text style={style.exerciseSubMeta}>
                        {prep.items.length} food
                        {prep.items.length !== 1 ? "s" : ""} ·{" "}
                        {prep.total_calories.toFixed(0)} kcal ·{" "}
                        {prep.total_protein.toFixed(1)}g protein
                      </Text>
                    </View>
                    <MaterialIcons
                      name={expanded ? "expand-less" : "expand-more"}
                      size={22}
                      color={theme.textLight}
                    />
                  </TouchableOpacity>

                  {/* Expanded detail */}
                  {expanded && (
                    <>
                      {/* Items list */}
                      <View style={{ gap: 6, marginTop: 8 }}>
                        {prep.items.map((item) => (
                          <View key={item.id} style={style.listCard}>
                            <Text style={style.listTitle}>
                              {item.food_name}
                            </Text>
                            <Text style={style.listMeta}>
                              {item.gramation}g ·{" "}
                              {parseNumber(item.calories).toFixed(0)} kcal ·{" "}
                              {parseNumber(item.protein).toFixed(1)}g protein
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Total macros */}
                      <View style={[style.setTable, { marginTop: 10 }]}>
                        <View style={style.setTableHeader}>
                          <Text style={style.setHeaderText}>Cal</Text>
                          <Text style={style.setHeaderText}>Protein</Text>
                          <Text style={style.setHeaderText}>Carbs</Text>
                          <Text style={style.setHeaderText}>Fat</Text>
                        </View>
                        <View style={style.setRow}>
                          <Text style={style.setValue}>
                            {prep.total_calories.toFixed(0)}
                          </Text>
                          <Text style={style.setValue}>
                            {prep.total_protein.toFixed(1)}g
                          </Text>
                          <Text style={style.setValue}>
                            {prep.total_carbohydrate.toFixed(1)}g
                          </Text>
                          <Text style={style.setValue}>
                            {prep.total_fat.toFixed(1)}g
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={[style.chipRow, { marginTop: 10 }]}>
                        <TouchableOpacity
                          style={[style.filterChip, style.filterChipActive]}
                          onPress={() => openLogModal(prep.id)}
                        >
                          <MaterialIcons
                            name="restaurant"
                            size={14}
                            color={theme.white ?? theme.primary}
                          />
                          <Text
                            style={[
                              style.filterChipText,
                              style.filterChipTextActive,
                            ]}
                          >
                            {" "}
                            Log to Diary
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={style.filterChip}
                          onPress={() => openEdit(prep)}
                        >
                          <MaterialIcons
                            name="edit"
                            size={14}
                            color={theme.primary}
                          />
                          <Text style={style.filterChipText}> Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={style.filterChip}
                          onPress={() => confirmDelete(prep)}
                        >
                          <MaterialIcons
                            name="delete-outline"
                            size={14}
                            color={theme.expense ?? "#e74c3c"}
                          />
                          <Text
                            style={[
                              style.filterChipText,
                              { color: theme.expense ?? "#e74c3c" },
                            ]}
                          >
                            {" "}
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FOOD SEARCH MODAL ─────────────────────────────────────────────────── */}
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
              <TouchableOpacity
                onPress={() => {
                  setShowFoodPicker(false);
                  setSearch("");
                  setEditingItemKey(null);
                }}
              >
                <MaterialIcons name="close" size={22} color={theme.textBlack} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={style.input}
              placeholder="Chicken rice, banana, egg..."
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
                  Type at least 2 characters to search.
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
                  No foods found. Try another term.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── LOG TO DIARY MODAL ────────────────────────────────────────────────── */}
      <Modal
        visible={showLogModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={style.modalBackdrop}>
          <View style={style.modalCard}>
            <View style={style.modalHeader}>
              <Text style={style.modalTitle}>Log to Diary</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <MaterialIcons name="close" size={22} color={theme.textBlack} />
              </TouchableOpacity>
            </View>

            <Text style={style.listMeta}>Date</Text>
            <TextInput
              style={[style.input, { marginBottom: 12 }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textLight}
              value={logDate}
              onChangeText={setLogDate}
            />

            <Text style={style.listMeta}>Meal</Text>
            <View style={style.chipRow}>
              {mealOptions.map((m) => {
                const active = logMeal === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[style.filterChip, active && style.filterChipActive]}
                    onPress={() => setLogMeal(m.value)}
                  >
                    <Text
                      style={[
                        style.filterChipText,
                        active && style.filterChipTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[style.primaryButton, { marginTop: 16 }]}
              onPress={confirmLog}
              disabled={logMutation.isPending}
            >
              {logMutation.isPending ? (
                <ActivityIndicator color={theme.white} />
              ) : (
                <Text style={style.primaryButtonText}>Log to Diary</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
