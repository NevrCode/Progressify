import { gymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import { useAlert } from "@/context/AlertContext";
import { useDiaryContext } from "@/context/DairyContext";
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
  MealPrepItemResponse,
  MealPrepResponse,
} from "@/services/mealPrepService";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ── Constants ─────────────────────────────────────────────────────────────────

type DraftItem = MealPrepItemRequest & { key: string };

// Rotating accent colors for food items inside a prep
const ITEM_ACCENT_COLORS = [
  "#378ADD",
  "#1D9E75",
  "#7F77DD",
  "#EF9F27",
  "#D85A30",
  "#D4537E",
];

const MEAL_OPTIONS: { value: MealType; label: string; emoji: string }[] = [
  { value: "BREAKFAST", label: "Breakfast", emoji: "🌅" },
  { value: "LUNCH", label: "Lunch", emoji: "☀️" },
  { value: "DINNER", label: "Dinner", emoji: "🌙" },
  { value: "SNACK", label: "Snack", emoji: "🍎" },
];

const parseNumber = (v?: string | number) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatDateForApi = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

// ── Macro pill ────────────────────────────────────────────────────────────────

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
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
        {label}
        {label ? " " : ""}
        {value?.toFixed(0) ?? "0"}
        {unit}
      </Text>
    </View>
  );
}

// ── Food item row inside expanded prep ────────────────────────────────────────

function PrepFoodItem({
  item,
  index,
  theme,
}: {
  item: MealPrepItemResponse;
  index: number;
  theme: ThemeType;
}) {
  const accentColor = ITEM_ACCENT_COLORS[index % ITEM_ACCENT_COLORS.length];
  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          marginBottom: 3,
          color: theme.textBlack,
        }}
      >
        {item.food_name}
      </Text>
      <Text style={{ fontSize: 11, color: theme.textLight }}>
        {item.gramation?.toFixed(0)}g · {item.calories?.toFixed(0)} kcal · P{" "}
        {item.protein?.toFixed(1)}g · C {item.carbohydrate?.toFixed(1)}g · F{" "}
        {item.fat?.toFixed(1)}g
      </Text>
    </View>
  );
}

// ── Prep card ─────────────────────────────────────────────────────────────────

function PrepCard({
  prep,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onLog,
  theme,
  style,
}: {
  prep: MealPrepResponse;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLog: () => void;
  theme: ThemeType;
  style: any;
}) {
  const topColors = ITEM_ACCENT_COLORS[prep.id % ITEM_ACCENT_COLORS.length];

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: theme.border ?? "#eee",
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {/* Colored top accent bar */}
      <View style={{ height: 4, flexDirection: "row" }}>
        <View style={{ flex: 1, backgroundColor: topColors }} />
        <View style={{ flex: 1, backgroundColor: topColors }} />
      </View>

      {/* Header */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        style={{ padding: 14, paddingBottom: expanded ? 10 : 14 }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[style.exerciseName, { marginBottom: 2 }]}>
              {prep.name}
            </Text>
            {!!prep.description && (
              <Text style={[style.listMeta, { marginBottom: 8 }]}>
                {prep.description}
              </Text>
            )}
            {/* Macro pills */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 5,
                marginTop: 4,
              }}
            >
              <MacroPill
                label=""
                value={prep.total_calories}
                unit=" kcal"
                bg="#ffbc49"
                color="#361e02"
              />
              {/* Protein — blue */}
              <MacroPill
                label="P"
                value={prep.total_protein}
                unit="g"
                bg="#49a3f7"
                color="#052546"
              />
              {/* Carbs — green */}
              <MacroPill
                label="C"
                value={prep.total_carbohydrate}
                unit="g"
                bg={theme.income}
                color="#1b3e02"
              />
              {/* Fat — coral */}
              <MacroPill
                label="F"
                value={prep.total_fat}
                unit="g"
                bg={theme.expense}
                color="#541702"
              />
              <View
                style={{
                  backgroundColor: theme.border ?? "#eee",
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textLight }}>
                  {prep.items.length} foods
                </Text>
              </View>
            </View>
          </View>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={22}
            color={theme.textLight}
            style={{ marginTop: 2 }}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded */}
      {expanded && (
        <>
          <View
            style={{
              height: 0.5,
              backgroundColor: theme.border ?? "#eee",
              marginHorizontal: 14,
            }}
          />

          {/* Food items */}
          <View style={{ padding: 14, paddingTop: 12, paddingBottom: 8 }}>
            {prep.items.map((item, index) => (
              <PrepFoodItem
                key={item.id}
                item={item}
                index={index}
                theme={theme}
              />
            ))}
          </View>

          {/* Action buttons */}
          <View
            style={{ flexDirection: "row", gap: 8, padding: 14, paddingTop: 4 }}
          >
            {/* Log — primary */}
            <TouchableOpacity
              onPress={onLog}
              style={{
                flex: 2,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingVertical: 10,
              }}
            >
              <MaterialIcons name="playlist-add-check" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                Log to Diary
              </Text>
            </TouchableOpacity>

            {/* Edit */}
            <TouchableOpacity
              onPress={onEdit}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                backgroundColor: theme.background,
                borderRadius: 10,
                paddingVertical: 10,
                borderWidth: 0.5,
                borderColor: theme.border,
              }}
            >
              <MaterialIcons name="edit" size={15} color={theme.primary} />
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Edit
              </Text>
            </TouchableOpacity>

            {/* Delete — icon only */}
            <TouchableOpacity
              onPress={onDelete}
              style={{
                width: 40,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.background,
                borderRadius: 10,
              }}
            >
              <MaterialIcons name="delete-outline" size={18} color="#A32D2D" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MealPrepSection() {
  const { theme } = useTheme();
  const style = gymStyles(theme);
  const { alert } = useAlert();
  const { selectedDate, setSelectedDate } = useDiaryContext();

  const { data: mealPrepsPage, isLoading } = useMealPreps();
  const mealPreps = mealPrepsPage?.data ?? [];

  const createMutation = useCreateMealPrep();
  const updateMutation = useUpdateMealPrep();
  const deleteMutation = useDeleteMealPrep();
  const logMutation = useLogMealPrep();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrep, setEditingPrep] = useState<MealPrepResponse | null>(null);
  const [prepName, setPrepName] = useState("");
  const [prepDesc, setPrepDesc] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [logTargetPrep, setLogTargetPrep] = useState<MealPrepResponse | null>(
    null,
  );
  const [logMealType, setLogMealType] = useState<MealType>("LUNCH");

  const foodSearchQuery = useQuery({
    queryKey: ["mealprep-food-search", search.trim()],
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
    onError: (e: any) => alert("Food detail failed", e.message),
  });

  const updateGramation = (key: string, raw: string) => {
    const grams = Math.max(parseNumber(raw), 0);
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const base = parseNumber(item.gramation) || 100;
        const ratio = base > 0 ? grams / base : 0;
        return {
          ...item,
          gramation: grams,
          calories: parseNumber(item.calories) * ratio,
          protein: parseNumber(item.protein) * ratio,
          fat: parseNumber(item.fat) * ratio,
          carbohydrate: parseNumber(item.carbohydrate) * ratio,
        };
      }),
    );
  };

  const removeItem = (key: string) =>
    setDraftItems((prev) => prev.filter((i) => i.key !== key));

  const draftTotals = useMemo(
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
    setPrepName("");
    setPrepDesc("");
  };

  const savePrep = () => {
    if (!prepName.trim())
      return alert("Name required", "Give your meal prep a name.");
    if (draftItems.length === 0)
      return alert("Add foods", "Add at least one food item.");
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
          onError: (e: any) => alert("Update failed", e.message),
        },
      );
    } else {
      createMutation.mutate(dto, {
        onSuccess: closeForm,
        onError: (e: any) => alert("Create failed", e.message),
      });
    }
  };

  const confirmDelete = (prep: MealPrepResponse) =>
    alert("Delete meal prep", `Remove "${prep.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(prep.id),
      },
    ]);

  const logPrep = () => {
    if (!logTargetPrep) return;
    logMutation.mutate(
      {
        id: logTargetPrep.id,
        dto: { date: selectedDate, mealType: logMealType },
      },
      {
        onSuccess: () => {
          setLogTargetPrep(null);
          alert("Logged ✓", `"${logTargetPrep.name}" added to your diary.`);
        },
        onError: (e: any) => alert("Log failed", e.message),
      },
    );
  };

  return (
    <>
      {/* Section header */}
      <View style={[style.sectionHeader, { marginBottom: 10 }]}>
        <Text style={style.sectionTitle}>Meal Preps</Text>
        <TouchableOpacity
          style={[
            style.inlineAction,
            {
              backgroundColor: theme.primary + "15",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
            },
          ]}
          onPress={formOpen ? closeForm : openCreate}
        >
          <MaterialIcons
            name={formOpen ? "close" : "add"}
            size={15}
            color={theme.primary}
          />
          <Text style={[style.inlineActionText, { marginLeft: 3 }]}>
            {formOpen ? "Cancel" : "New Prep"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create / edit form */}
      {formOpen && (
        <View style={style.exerciseCard}>
          <Text style={style.sectionTitle}>
            {editingPrep ? `Editing: ${editingPrep.name}` : "New Meal Prep"}
          </Text>
          <TextInput
            style={[style.input, { marginTop: 8 }]}
            placeholder="Prep name"
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

          {draftItems.length > 0 && (
            <View style={{ gap: 8, marginTop: 4 }}>
              {draftItems.map((item, index) => (
                <View
                  key={item.key}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.03)",
                    borderRadius: 10,
                    borderLeftWidth: 3,
                    borderLeftColor:
                      ITEM_ACCENT_COLORS[index % ITEM_ACCENT_COLORS.length],
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                        size={17}
                        color={theme.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeItem(item.key)}
                      style={{ marginLeft: 10 }}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={17}
                        color="#A32D2D"
                      />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[style.input, { marginTop: 8 }]}
                    keyboardType="decimal-pad"
                    placeholder="Gramation (g)"
                    placeholderTextColor={theme.textLight}
                    value={String(item.gramation)}
                    onChangeText={(v) => updateGramation(item.key, v)}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 5,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <MacroPill
                      label=""
                      value={item.calories}
                      unit=" kcal"
                      bg="#ffbc49"
                      color="#361e02"
                    />
                    {/* Protein — blue */}
                    <MacroPill
                      label="P"
                      value={item.protein}
                      unit="g"
                      bg="#49a3f7"
                      color="#052546"
                    />
                    {/* Carbs — green */}
                    <MacroPill
                      label="C"
                      value={item.carbohydrate}
                      unit="g"
                      bg={theme.income}
                      color="#1b3e02"
                    />
                    {/* Fat — coral */}
                    <MacroPill
                      label="F"
                      value={item.fat}
                      unit="g"
                      bg={theme.expense}
                      color="#541702"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {draftItems.length > 0 && (
            <View style={[style.exerciseCard, { marginTop: 10 }]}>
              <Text
                style={[
                  style.listMeta,
                  { textAlign: "center", marginBottom: 4 },
                ]}
              >
                Total
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 6,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <MacroPill
                  label=""
                  value={draftTotals.calories}
                  unit=" Cal"
                  bg="#ffbc49"
                  color="#361e02"
                />
                {/* Protein — blue */}
                <MacroPill
                  label="P"
                  value={draftTotals.protein}
                  unit="g"
                  bg="#49a3f7"
                  color="#052546"
                />
                {/* Carbs — green */}
                <MacroPill
                  label="C"
                  value={draftTotals.carbohydrate}
                  unit="g"
                  bg={theme.income}
                  color="#1b3e02"
                />
                {/* Fat — coral */}
                <MacroPill
                  label="F"
                  value={draftTotals.fat}
                  unit="g"
                  bg={theme.expense}
                  color="#541702"
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[style.inlineAction, { marginTop: 10 }]}
            onPress={() => {
              setEditingItemKey(null);
              setShowFoodPicker(true);
            }}
          >
            <MaterialIcons name="search" size={16} color={theme.primary} />
            <Text style={style.inlineActionText}>Add Food</Text>
          </TouchableOpacity>

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

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
      ) : mealPreps.length === 0 && !formOpen ? (
        <View style={style.subEmptyCard}>
          <Text style={style.subEmptyText}>
            No meal preps yet. Create one to save your go-to meals.
          </Text>
        </View>
      ) : (
        mealPreps.map((prep) => (
          <PrepCard
            key={prep.id}
            prep={prep}
            expanded={expandedId === prep.id}
            onToggle={() =>
              setExpandedId(expandedId === prep.id ? null : prep.id)
            }
            onEdit={() => {
              openEdit(prep);
              setExpandedId(null);
            }}
            onDelete={() => confirmDelete(prep)}
            onLog={() => {
              setLogTargetPrep(prep);
              setLogMealType("LUNCH");
              setSelectedDate(formatDateForApi(new Date()));
            }}
            theme={theme}
            style={style}
          />
        ))
      )}

      {/* Food search modal */}
      <Modal
        visible={showFoodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowFoodPicker(false);
          setSearch("");
          setEditingItemKey(null);
        }}
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
                      {foodDetailMutation.isPending ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <MaterialIcons
                          name="add-circle-outline"
                          size={22}
                          color={theme.primary}
                        />
                      )}
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

      {/* Log modal */}
      <Modal
        visible={!!logTargetPrep}
        transparent
        animationType="slide"
        onRequestClose={() => setLogTargetPrep(null)}
      >
        <View style={style.modalBackdrop}>
          <View style={style.modalCard}>
            <View style={style.modalHeader}>
              <Text style={style.modalTitle}>Log to Diary</Text>
              <TouchableOpacity onPress={() => setLogTargetPrep(null)}>
                <MaterialIcons name="close" size={22} color={theme.textBlack} />
              </TouchableOpacity>
            </View>

            {/* Prep summary */}
            <View style={{ marginBottom: 14 }}>
              <Text style={style.exerciseName}>{logTargetPrep?.name}</Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 5,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <MacroPill
                  label=""
                  value={logTargetPrep?.total_calories}
                  unit=" kcal"
                  bg="#ffbc49"
                  color="#361e02"
                />
                {/* Protein — blue */}
                <MacroPill
                  label="P"
                  value={logTargetPrep?.total_protein}
                  unit="g"
                  bg="#49a3f7"
                  color="#052546"
                />
                {/* Carbs — green */}
                <MacroPill
                  label="C"
                  value={logTargetPrep?.total_carbohydrate}
                  unit="g"
                  bg={theme.income}
                  color="#1b3e02"
                />
                {/* Fat — coral */}
                <MacroPill
                  label="F"
                  value={logTargetPrep?.total_fat}
                  unit="g"
                  bg={theme.expense}
                  color="#541702"
                />
              </View>
            </View>

            {/* Meal type picker */}
            <Text
              style={[style.listMeta, { marginBottom: 8, fontWeight: "700" }]}
            >
              Meal type
            </Text>
            <View style={style.chipRow}>
              {MEAL_OPTIONS.map((m) => {
                const active = logMealType === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[style.filterChip, active && style.filterChipActive]}
                    onPress={() => setLogMealType(m.value)}
                  >
                    <Text
                      style={[
                        style.filterChipText,
                        active && style.filterChipTextActive,
                      ]}
                    >
                      {m.emoji} {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                style={[
                  style.filterChip,
                  { flex: 1, justifyContent: "center" },
                ]}
                onPress={() => setLogTargetPrep(null)}
              >
                <Text style={style.filterChipText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[style.primaryButton, { flex: 2 }]}
                onPress={logPrep}
                disabled={logMutation.isPending}
              >
                {logMutation.isPending ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text style={style.primaryButtonText}>Log to Diary ✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
