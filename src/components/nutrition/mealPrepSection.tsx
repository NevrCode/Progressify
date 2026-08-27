import { gymStyles, type GymStyles } from "@/assets/styles/gym.style";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { AppButton } from "@/components/base/app-button";
import { ModalHeader } from "@/components/base/modal-header";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { MealPrepDetailSheet } from "@/components/nutrition/meal-prep-detail-sheet";
import { ThemeType } from "@/constants/colors";
import { useAlert } from "@/context/AlertContext";
import { useDiaryContext } from "@/context/DairyContext";
import { useTheme } from "@/context/ThemeContext";
import { FONT_FAMILIES } from "@/constants/typography";
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
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
import { MealPrepResponse } from "@/services/mealPrepService";
import { MaterialIcons } from "@expo/vector-icons";
import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FoodSearchModal, SelectedFoodResult } from "./foodSearchModal";
import { DraftItemCard, type DraftItem } from "./draft-item-card";
import { MacroPill } from "./macro-pill";

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

type PrepRowProps = {
  prep: MealPrepResponse;
  index: number;
  onPress: (prep: MealPrepResponse, index: number) => void;
  theme: ThemeType;
  styles: GymStyles;
};

/**
 * Memoized: the meal prep list re-renders whenever the section's own state
 * changes (form open/closed, action feedback), and each row is otherwise
 * static once its prep data is loaded.
 */
function PrepRowComponent({ prep, index, onPress, theme, styles }: PrepRowProps) {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open meal prep ${prep.name}`}
      onPress={() => onPress(prep, index)}
      activeOpacity={0.75}
      style={styles.prepRow}
    >
      <View style={[styles.prepRowAccent, { backgroundColor: accent }]} />
      <View style={styles.prepRowBody}>
        <Text style={styles.prepRowName} numberOfLines={1}>
          {prep.name}
        </Text>
        <View style={styles.prepRowMacroRow}>
          <MacroPill
            label=""
            value={prep.total_calories}
            unit=" kcal"
            bg="#FAEEDA"
            color="#633806"
            styles={styles}
          />
          <MacroPill
            label="P"
            value={prep.total_protein}
            unit="g"
            bg="#E6F1FB"
            color="#0C447C"
            styles={styles}
          />
          <Text style={styles.prepRowFoodCount}>
            {prep.items.length} food{prep.items.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={theme.textLight} />
    </TouchableOpacity>
  );
}

const PrepRow = memo(PrepRowComponent);

export function MealPrepSection() {
  const { theme } = useTheme();
  const style = useMemo(() => gymStyles(theme), [theme]);
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
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logMealType, setLogMealType] = useState<MealType>("LUNCH");
  const [actionFeedback, setActionFeedback] = useState<
    (ActionFeedback & { surface: "section" | "form" | "detail" | "log" }) | null
  >(null);

  const updateGramation = useCallback((key: string, raw: string) => {
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
  }, []);

  const removeItem = useCallback(
    (key: string) =>
      setDraftItems((prev) => prev.filter((i) => i.key !== key)),
    [],
  );

  const editItem = useCallback((key: string) => {
    setEditingItemKey(key);
    setShowFoodPicker(true);
  }, []);

  const handlePrepPress = useCallback((prep: MealPrepResponse, index: number) => {
    setSelectedPrep(prep);
    setSelectedIndex(index);
  }, []);

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
    setActionFeedback(null);
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
    setActionFeedback(null);
  };

  const openEdit = (prep: MealPrepResponse) => {
    setActionFeedback(null);
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
    if (!prepName.trim()) {
      setActionFeedback({
        surface: "form",
        status: "error",
        title: "Name required",
        message: "Give your meal prep a name.",
      });
      return;
    }
    if (draftItems.length === 0) {
      setActionFeedback({
        surface: "form",
        status: "error",
        title: "Add foods",
        message: "Add at least one food item.",
      });
      return;
    }

    // Strip the client-side 'key' property to avoid backend Jackson deserialization errors
    const cleanedItems = draftItems.map(({ key, ...item }) => item);

    const dto = {
      name: prepName.trim(),
      description: prepDesc.trim() || undefined,
      items: cleanedItems,
    };
    setActionFeedback(null);
    const operation = editingPrep ? "updated" : "created";
    const handleSuccess = (result: unknown) => {
      const queued = isOfflineQueuedResponse(result);
      setFormOpen(false);
      setEditingPrep(null);
      setDraftItems([]);
      setPrepName("");
      setPrepDesc("");
      setActionFeedback({
        surface: "section",
        status: queued ? "info" : "success",
        title: queued ? "Meal prep saved locally" : `Meal prep ${operation}`,
        message: queued
          ? "The change is waiting in the device synchronization queue."
          : `Your meal prep was ${operation} successfully.`,
      });
    };
    const handleError = (error: unknown) =>
      setActionFeedback({
        surface: "form",
        status: "error",
        title: editingPrep
          ? "Could not update meal prep"
          : "Could not create meal prep",
        message: toApiError(error).message,
      });

    if (editingPrep)
      updateMutation.mutate(
        { id: editingPrep.id, dto },
        {
          onSuccess: handleSuccess,
          onError: handleError,
        },
      );
    else
      createMutation.mutate(dto, {
        onSuccess: handleSuccess,
        onError: handleError,
      });
  };

  const confirmDelete = (prep: MealPrepResponse) =>
    alert("Delete meal prep", `Remove "${prep.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setActionFeedback(null);
          deleteMutation.mutate(prep.id, {
            onSuccess: (result) => {
              const queued = isOfflineQueuedResponse(result);
              setSelectedPrep(null);
              setActionFeedback({
                surface: "section",
                status: queued ? "info" : "success",
                title: queued ? "Deletion saved locally" : "Meal prep deleted",
                message: queued
                  ? "The meal prep will be removed after synchronization."
                  : `"${prep.name}" was removed.`,
              });
            },
            onError: (error) =>
              setActionFeedback({
                surface: "detail",
                status: "error",
                title: "Could not delete meal prep",
                message: toApiError(error).message,
              }),
          });
        },
      },
    ]);

  const logPrep = () => {
    if (!selectedPrep) return;
    setActionFeedback(null);
    const prepName = selectedPrep.name;
    logMutation.mutate(
      {
        id: selectedPrep.id,
        dto: { date: selectedDate, meal_type: logMealType },
      },
      {
        onSuccess: (result) => {
          const queued = isOfflineQueuedResponse(result);
          setShowLogModal(false);
          setSelectedPrep(null);
          setActionFeedback({
            surface: "section",
            status: queued ? "info" : "success",
            title: queued ? "Meal saved locally" : "Meal prep logged",
            message: queued
              ? `"${prepName}" is waiting to synchronize with the diary.`
              : `"${prepName}" was added to the diary.`,
          });
        },
        onError: (error) =>
          setActionFeedback({
            surface: "log",
            status: "error",
            title: "Could not log meal prep",
            message: toApiError(error).message,
          }),
      },
    );
  };

  return (
    <>
      <View style={[style.sectionHeader, style.mealPrepSectionHeaderSpacing]}>
        <Text style={style.sectionTitle}>Meal Preps</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={formOpen ? "Close meal prep form" : "Create meal prep"}
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

      {actionFeedback?.surface === "section" ? (
        <ActionStatus
          {...actionFeedback}
          onDismiss={() => setActionFeedback(null)}
        />
      ) : null}

      {formOpen && (
        <ShadowGlowCard style={style.foodDiaryCard}>
          <Text style={style.sectionTitle}>
            {editingPrep ? `Editing: ${editingPrep.name}` : "New Meal Prep"}
          </Text>
          {actionFeedback?.surface === "form" ? (
            <View style={style.inlineFeedbackSpacing}>
              <ActionStatus
                {...actionFeedback}
                onDismiss={() => setActionFeedback(null)}
              />
            </View>
          ) : null}
          <TextInput
            style={[style.input, style.inputSpacingTop8]}
            placeholder="Prep name"
            placeholderTextColor={theme.textLight}
            value={prepName}
            onChangeText={setPrepName}
          />
          <TextInput
            style={[style.input, style.inputSpacingTop8]}
            placeholder="Description (optional)"
            placeholderTextColor={theme.textLight}
            value={prepDesc}
            onChangeText={setPrepDesc}
          />
          {draftItems.length > 0 && (
            <View style={style.draftItemsList}>
              {draftItems.map((item, index) => (
                <DraftItemCard
                  key={item.key}
                  item={item}
                  accentColor={ACCENT_COLORS[index % ACCENT_COLORS.length]}
                  theme={theme}
                  styles={style}
                  onEdit={editItem}
                  onRemove={removeItem}
                  onChangeGramation={updateGramation}
                />
              ))}
            </View>
          )}
          {draftItems.length > 0 && (
            <View style={style.draftTotalsRow}>
              <MacroPill
                label=""
                value={draftTotals.calories}
                unit=" kcal"
                bg="#FAEEDA"
                color="#633806"
                styles={style}
              />
              <MacroPill
                label="P"
                value={draftTotals.protein}
                unit="g"
                bg="#E6F1FB"
                color="#0C447C"
                styles={style}
              />
              <MacroPill
                label="C"
                value={draftTotals.carbohydrate}
                unit="g"
                bg="#EAF3DE"
                color="#27500A"
                styles={style}
              />
              <MacroPill
                label="F"
                value={draftTotals.fat}
                unit="g"
                bg="#FAECE7"
                color="#712B13"
                styles={style}
              />
            </View>
          )}
          <TouchableOpacity
            style={[style.inlineAction, style.addFoodButtonSpacing]}
            onPress={() => {
              setEditingItemKey(null);
              setShowFoodPicker(true);
            }}
          >
            <MaterialIcons name="search" size={16} color={theme.primary} />
            <Text style={style.inlineActionText}>Add Food</Text>
          </TouchableOpacity>
          <AppButton
            label={editingPrep ? "Save Changes" : "Create Meal Prep"}
            loading={createMutation.isPending || updateMutation.isPending}
            onPress={savePrep}
            style={style.savePrepButtonSpacing}
          />
        </ShadowGlowCard>
      )}

      {isLoading ? (
        <ActivityIndicator
          color={theme.primary}
          style={style.loadingIndicatorSpacing}
        />
      ) : mealPreps.length === 0 && !formOpen ? (
        <ShadowGlowCard style={style.foodDiaryCard}>
          <Text style={style.subEmptyText}>
            No meal preps yet. Create one to save your go-to meals.
          </Text>
        </ShadowGlowCard>
      ) : (
        !formOpen && (
          <ShadowGlowCard style={style.foodDiaryCardFlush}>
            {mealPreps.map((prep, index) => (
              <PrepRow
                key={prep.id}
                prep={prep}
                index={index}
                theme={theme}
                styles={style}
                onPress={handlePrepPress}
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
          style={[style.modalBackdrop, style.modalBackdropBottom]}
          activeOpacity={1}
          onPress={() => setSelectedPrep(null)}
        >
          <View style={style.fullWidth}>
            {selectedPrep && (
              <MealPrepDetailSheet
                prep={selectedPrep}
                index={selectedIndex}
                onClose={() => setSelectedPrep(null)}
                onEdit={() => openEdit(selectedPrep)}
                onDelete={() => confirmDelete(selectedPrep)}
                onLog={() => {
                  setActionFeedback(null);
                  setShowLogModal(true);
                  setLogMealType("LUNCH");
                  setSelectedDate(formatDateForApi(new Date()));
                }}
                feedback={
                  actionFeedback?.surface === "detail"
                    ? actionFeedback
                    : undefined
                }
                onDismissFeedback={() => setActionFeedback(null)}
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
        onRequestClose={() => {
          setShowLogModal(false);
          setActionFeedback(null);
        }}
      >
        <View style={style.modalBackdrop}>
          <View
            accessibilityViewIsModal
            style={[style.modalCard, style.logModalCardPadding]}
          >
            <ModalHeader
              closeLabel="Close log meal prep"
              onClose={() => {
                setShowLogModal(false);
                setActionFeedback(null);
              }}
              style={style.modalHeader}
              title="Log to Diary"
            />
            {actionFeedback?.surface === "log" ? (
              <ActionStatus
                {...actionFeedback}
                onDismiss={() => setActionFeedback(null)}
              />
            ) : null}
            <Text style={style.mealTypeLabel}>Select Meal Type</Text>
            <View style={style.mealTypeOptionsRow}>
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
                    accessibilityRole="radio"
                    accessibilityLabel={m.label}
                    accessibilityState={{ selected: active }}
                    style={[
                      style.mealTypeOption,
                      {
                        backgroundColor: active
                          ? mealColor + "15"
                          : theme.background,
                        borderColor: active
                          ? mealColor
                          : (theme.border ?? "#eee"),
                      },
                    ]}
                    onPress={() => setLogMealType(m.value)}
                  >
                    <Text
                      style={[
                        style.mealTypeOptionText,
                        {
                          color: active ? mealColor : theme.textBlack,
                          fontFamily: active
                            ? FONT_FAMILIES.bold
                            : FONT_FAMILIES.medium,
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={style.logModalActionsRow}>
              <TouchableOpacity
                style={style.logModalCancelButton}
                onPress={() => {
                  setShowLogModal(false);
                  setActionFeedback(null);
                }}
              >
                <Text style={style.logModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={style.logModalConfirmButton}
                onPress={logPrep}
                disabled={logMutation.isPending}
              >
                {logMutation.isPending ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text style={style.logModalConfirmButtonText}>
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
