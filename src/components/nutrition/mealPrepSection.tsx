import { gymStyles } from "@/assets/styles/gym.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
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
  MealType,
} from "@/services/foodDiaryService";
import {
  MealPrepItemRequest,
  MealPrepResponse,
} from "@/services/mealPrepService";
import { MaterialIcons } from "@expo/vector-icons";
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

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
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
  const foodDiaryCardStyle = {
    backgroundColor: theme.background,
    borderColor: theme.primary + "20",
    borderWidth: 1.5,
  };

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
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logMealType, setLogMealType] = useState<MealType>("LUNCH");

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

    // Strip the client-side 'key' property to avoid backend Jackson deserialization errors
    const cleanedItems = draftItems.map(({ key, ...item }) => item);

    const dto = {
      name: prepName.trim(),
      description: prepDesc.trim() || undefined,
      items: cleanedItems,
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
          style={style.inlineAction}
          onPress={formOpen ? closeForm : openCreate}
        >
          <MaterialIcons
            name={formOpen ? "close" : "add"}
            size={14}
            color={theme.primary}
          />
          <Text style={style.inlineActionText}>
            {formOpen ? "Cancel" : "New Prep"}
          </Text>
        </TouchableOpacity>
      </View>

      {formOpen && (
        <ShadowGlowCard style={foodDiaryCardStyle}>
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
            style={[style.input, { marginTop: 8 }]}
            placeholder="Description (optional)"
            placeholderTextColor={theme.textLight}
            value={prepDesc}
            onChangeText={setPrepDesc}
          />
          {draftItems.length > 0 && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {draftItems.map((item, index) => (
                <View
                  key={item.key}
                  style={{
                    backgroundColor: theme.background,
                    borderRadius: 12,
                    borderWidth: 0.5,
                    borderColor: theme.border ?? "#eee",
                    borderLeftWidth: 3.5,
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
                backgroundColor: theme.card,
                borderRadius: 10,
                borderWidth: 0.5,
                borderColor: theme.border ?? "#eee",
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
        </ShadowGlowCard>
      )}

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
      ) : mealPreps.length === 0 && !formOpen ? (
        <ShadowGlowCard style={foodDiaryCardStyle}>
          <Text style={style.subEmptyText}>
            No meal preps yet. Create one to save your go-to meals.
          </Text>
        </ShadowGlowCard>
      ) : (
        !formOpen && (
          <ShadowGlowCard
            style={{
              ...foodDiaryCardStyle,
              padding: 0,
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
          </ShadowGlowCard>
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
          <View style={[style.modalCard, { paddingBottom: 24 }]}>
            <View style={style.modalHeader}>
              <Text
                style={[
                  style.modalTitle,
                  { fontFamily: "PlusJakartaSans_800ExtraBold" },
                ]}
              >
                Log to Diary
              </Text>
              <TouchableOpacity
                onPress={() => setShowLogModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.background,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 0.5,
                  borderColor: theme.border ?? "#eee",
                }}
              >
                <MaterialIcons name="close" size={18} color={theme.textBlack} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: theme.textLight,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginTop: 4,
                marginBottom: 2,
                fontFamily: "PlusJakartaSans_500Medium",
              }}
            >
              Select Meal Type
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {MEAL_OPTIONS.map((m) => {
                const active = logMealType === m.value;
                const mealColor =
                  m.value === "BREAKFAST"
                    ? "#f69f1d"
                    : m.value === "LUNCH"
                      ? "#0090FF"
                      : m.value === "DINNER"
                        ? "#7F77DD"
                        : "#1D9E75";
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={{
                      flex: 1,
                      backgroundColor: active
                        ? mealColor + "15"
                        : theme.background,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active
                        ? mealColor
                        : (theme.border ?? "#eee"),
                      paddingVertical: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => setLogMealType(m.value)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: active ? mealColor : theme.textBlack,
                        fontFamily: active
                          ? "PlusJakartaSans_700Bold"
                          : "PlusJakartaSans_500Medium",
                      }}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border ?? "#eee",
                  paddingVertical: 13,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => setShowLogModal(false)}
              >
                <Text
                  style={{
                    color: theme.textLight,
                    fontSize: 13,
                    fontWeight: "700",
                    fontFamily: "PlusJakartaSans_500Medium",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 2,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                onPress={logPrep}
                disabled={logMutation.isPending}
              >
                {logMutation.isPending ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text
                    style={{
                      color: theme.white ?? "#fff",
                      fontSize: 13,
                      fontWeight: "800",
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                    }}
                  >
                    Log to Diary ✓
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FoodSearchModal
        visible={showFoodPicker}
        onClose={() => {
          setShowFoodPicker(false);
          setEditingItemKey(null);
        }}
        onFoodSelected={(food: SelectedFoodResult) => {
          const newItem: DraftItem = {
            key: editingItemKey || Date.now().toString(),
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
          if (editingItemKey) {
            setDraftItems((prev) =>
              prev.map((item) =>
                item.key === editingItemKey ? newItem : item,
              ),
            );
            setEditingItemKey(null);
          } else {
            setDraftItems((prev) => [...prev, newItem]);
          }
          setShowFoodPicker(false);
        }}
      />
    </>
  );
}
