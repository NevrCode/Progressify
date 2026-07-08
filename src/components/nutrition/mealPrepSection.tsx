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
  MealPrepResponse,
} from "@/services/mealPrepService";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FoodSearchModal, SelectedFoodResult } from "./foodSearchModal";

type DraftItem = MealPrepItemRequest & { key: string };

const ACCENT_COLORS = [
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

const formatDateForApi = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");

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
        {value?.toFixed(0) ?? "0"}
        {unit}
      </Text>
    </View>
  );
}

function PrepRow({
  prep,
  index,
  onPress,
  theme,
}: {
  prep: MealPrepResponse;
  index: number;
  onPress: () => void;
  theme: ThemeType;
}) {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
  const [showAllItems, setShowAllItems] = useState(false); // ← add this

  const PREVIEW_COUNT = 3;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.border ?? "#eee",
      }}
    >
      <View
        style={{
          width: 4,
          height: 36,
          borderRadius: 3,
          backgroundColor: accent,
          flexShrink: 0,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: theme.textBlack,
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {prep.name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: 5,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <MacroPill
            label=""
            value={prep.total_calories}
            unit=" kcal"
            bg="#FAEEDA"
            color="#633806"
          />
          <MacroPill
            label="P"
            value={prep.total_protein}
            unit="g"
            bg="#E6F1FB"
            color="#0C447C"
          />
          <Text style={{ fontSize: 11, color: theme.textLight }}>
            {prep.items.length} food{prep.items.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={theme.textLight} />
    </TouchableOpacity>
  );
}

function PrepDetailSheet({
  prep,
  index,
  onClose,
  onEdit,
  onDelete,
  onLog,
  theme,
  style,
}: {
  prep: MealPrepResponse;
  index: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLog: () => void;
  theme: ThemeType;
  style: any;
}) {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
  const [showAllItems, setShowAllItems] = useState(false);
  const PREVIEW_COUNT = 3;
  const visibleItems = showAllItems
    ? prep.items
    : prep.items.slice(0, PREVIEW_COUNT);
  const hasMore = prep.items.length > PREVIEW_COUNT;
  return (
    <View
      style={[
        style.modalCard,
        { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
      ]}
    >
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.border ?? "#ddd",
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 4,
            borderRadius: 2,
            backgroundColor: accent,
            alignSelf: "stretch",
            marginRight: 10,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[style.exerciseName, { marginBottom: 2 }]}>
            {prep.name}
          </Text>
          {!!prep.description && (
            <Text style={style.listMeta}>{prep.description}</Text>
          )}
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
              value={prep.total_calories}
              unit=" kcal"
              bg="#FAEEDA"
              color="#633806"
            />
            <MacroPill
              label="P"
              value={prep.total_protein}
              unit="g"
              bg="#E6F1FB"
              color="#0C447C"
            />
            <MacroPill
              label="C"
              value={prep.total_carbohydrate}
              unit="g"
              bg="#EAF3DE"
              color="#27500A"
            />
            <MacroPill
              label="F"
              value={prep.total_fat}
              unit="g"
              bg="#FAECE7"
              color="#712B13"
            />
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <MaterialIcons name="close" size={20} color={theme.textLight} />
        </TouchableOpacity>
      </View>
      <View
        style={{
          height: 0.5,
          backgroundColor: theme.border ?? "#eee",
          marginBottom: 12,
        }}
      />
      <View>
        {visibleItems.map((item, i) => (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              borderBottomWidth: i < visibleItems.length - 1 ? 0.5 : 0,
              borderBottomColor: theme.border ?? "#eee",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 4,
                height: 32,
                borderRadius: 2,
                backgroundColor: ACCENT_COLORS[i % ACCENT_COLORS.length],
                flexShrink: 0,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.textBlack,
                  marginBottom: 2,
                }}
                numberOfLines={1}
              >
                {item.food_name}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textLight }}>
                {item.gramation?.toFixed(0)}g · {item.calories?.toFixed(0)} kcal
                · P {item.protein?.toFixed(1)}g · C{" "}
                {item.carbohydrate?.toFixed(1)}g · F {item.fat?.toFixed(1)}g
              </Text>
            </View>
          </View>
        ))}
        {hasMore && (
          <TouchableOpacity
            onPress={() => setShowAllItems(!showAllItems)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingVertical: 10,
            }}
          >
            <MaterialIcons
              name={showAllItems ? "expand-less" : "expand-more"}
              size={16}
              color={theme.primary}
            />
            <Text
              style={{ fontSize: 12, color: theme.primary, fontWeight: "600" }}
            >
              {showAllItems
                ? "Show less"
                : `Show all ${prep.items.length} foods`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <TouchableOpacity
          onPress={onLog}
          style={{
            flex: 2,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: theme.primary,
            borderRadius: 12,
            // paddingVertical: 4,
          }}
        >
          <MaterialIcons name="fastfood" size={14} color={theme.textBlack} />
          <Text
            style={{ color: theme.textBlack, fontSize: 14, fontWeight: "700" }}
          >
            Eat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onEdit}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            paddingVertical: 16,
            borderWidth: 0.5,
            backgroundColor: theme.background,
            borderColor: theme.border ?? "#eee",
          }}
        >
          <MaterialIcons name="edit" size={16} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: theme.background,
          }}
        >
          <MaterialIcons name="delete-outline" size={18} color="#A32D2D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

  const [selectedPrep, setSelectedPrep] = useState<MealPrepResponse | null>(
    null,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrep, setEditingPrep] = useState<MealPrepResponse | null>(null);
  const [prepName, setPrepName] = useState("");
  const [prepDesc, setPrepDesc] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
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
      } else setDraftItems((prev) => [...prev, newItem]);
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
        const ratio =
          (parseNumber(item.gramation) || 100) > 0
            ? grams / (parseNumber(item.gramation) || 100)
            : 0;
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
  const closeForm = () => {
    setFormOpen(false);
    setEditingPrep(null);
    setDraftItems([]);
    setPrepName("");
    setPrepDesc("");
  };

  const openEdit = (prep: MealPrepResponse) => {
    setSelectedPrep(null);
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
    if (editingPrep)
      updateMutation.mutate(
        { id: editingPrep.id, dto },
        {
          onSuccess: closeForm,
          onError: (e: any) => alert("Update failed", e.message),
        },
      );
    else
      createMutation.mutate(dto, {
        onSuccess: closeForm,
        onError: (e: any) => alert("Create failed", e.message),
      });
  };

  const confirmDelete = (prep: MealPrepResponse) =>
    alert("Delete meal prep", `Remove "${prep.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate(prep.id);
          setSelectedPrep(null);
        },
      },
    ]);

  const logPrep = () => {
    if (!selectedPrep) return;
    console.log({
      id: selectedPrep.id,
      dto: { date: selectedDate, meal_type: logMealType },
    });
    logMutation.mutate(
      {
        id: selectedPrep.id,
        dto: { date: selectedDate, meal_type: logMealType },
      },
      {
        onSuccess: () => {
          setShowLogModal(false);
          setSelectedPrep(null);
          alert("Logged ✓", `"${selectedPrep.name}" added to diary.`);
        },
        onError: (e: any) => alert("Log failed", e.message),
      },
    );
  };

  return (
    <>
      <View style={[style.sectionHeader, { marginBottom: 8 }]}>
        <Text style={style.sectionTitle}>Meal Preps</Text>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: theme.primary + "15",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
          onPress={formOpen ? closeForm : openCreate}
        >
          <MaterialIcons
            name={formOpen ? "close" : "add"}
            size={14}
            color={theme.primary}
          />
          <Text
            style={{ fontSize: 12, color: theme.primary, fontWeight: "600" }}
          >
            {formOpen ? "Cancel" : "New Prep"}
          </Text>
        </TouchableOpacity>
      </View>

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
                    backgroundColor: theme.background,
                    borderRadius: 10,
                    borderLeftWidth: 3,
                    borderLeftColor:
                      ACCENT_COLORS[index % ACCENT_COLORS.length],
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
                      value={parseNumber(item.calories)}
                      unit=" kcal"
                      bg="#FAEEDA"
                      color="#633806"
                    />
                    <MacroPill
                      label="P"
                      value={parseNumber(item.protein)}
                      unit="g"
                      bg="#E6F1FB"
                      color="#0C447C"
                    />
                    <MacroPill
                      label="C"
                      value={parseNumber(item.carbohydrate)}
                      unit="g"
                      bg="#EAF3DE"
                      color="#27500A"
                    />
                    <MacroPill
                      label="F"
                      value={parseNumber(item.fat)}
                      unit="g"
                      bg="#FAECE7"
                      color="#712B13"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
          {draftItems.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                gap: 5,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 10,
                padding: 10,
                backgroundColor: theme.background,
                borderRadius: 10,
              }}
            >
              <MacroPill
                label=""
                value={draftTotals.calories}
                unit=" kcal"
                bg="#FAEEDA"
                color="#633806"
              />
              <MacroPill
                label="P"
                value={draftTotals.protein}
                unit="g"
                bg="#E6F1FB"
                color="#0C447C"
              />
              <MacroPill
                label="C"
                value={draftTotals.carbohydrate}
                unit="g"
                bg="#EAF3DE"
                color="#27500A"
              />
              <MacroPill
                label="F"
                value={draftTotals.fat}
                unit="g"
                bg="#FAECE7"
                color="#712B13"
              />
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

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
      ) : mealPreps.length === 0 && !formOpen ? (
        <View style={style.subEmptyCard}>
          <Text style={style.subEmptyText}>
            No meal preps yet. Create one to save your go-to meals.
          </Text>
        </View>
      ) : (
        !formOpen && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: theme.border ?? "#eee",
              overflow: "hidden",
            }}
          >
            {mealPreps.map((prep, index) => (
              <PrepRow
                key={prep.id}
                prep={prep}
                index={index}
                theme={theme}
                onPress={() => {
                  setSelectedPrep(prep);
                  setSelectedIndex(index);
                }}
              />
            ))}
          </View>
        )
      )}

      <Modal
        visible={!!selectedPrep}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPrep(null)}
      >
        <TouchableOpacity
          style={[style.modalBackdrop, { justifyContent: "flex-end" }]}
          activeOpacity={1}
          onPress={() => setSelectedPrep(null)}
        >
          <View style={{ width: "100%" }}>
            {selectedPrep && (
              <PrepDetailSheet
                prep={selectedPrep}
                index={selectedIndex}
                onClose={() => setSelectedPrep(null)}
                onEdit={() => openEdit(selectedPrep)}
                onDelete={() => confirmDelete(selectedPrep)}
                onLog={() => {
                  setShowLogModal(true);
                  setLogMealType("LUNCH");
                  setSelectedDate(formatDateForApi(new Date()));
                }}
                theme={theme}
                style={style}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

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
                onPress={() => setShowLogModal(false)}
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

      <FoodSearchModal
        visible={showFoodPicker}
        onClose={() => setShowFoodPicker(false)}
        onFoodSelected={(food: SelectedFoodResult) => {
          const newItem: DraftItem = {
            key: Date.now().toString(),
            food_id: food.food_id,
            food_name: food.food_name,
            serving_id: food.serving_id,
            serving_description: food.serving_description,
            gramation: food.metric_serving_amount,
            calories: food.calories,
            protein: food.protein,
            fat: food.fat,
            carbohydrate: food.carbohydrate,
          };
          setDraftItems((prev) => [...prev, newItem]);
        }}
      />
    </>
  );
}
