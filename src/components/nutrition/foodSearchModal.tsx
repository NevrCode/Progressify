import { gymStyles } from "@/assets/styles/gym.style";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { AppButton } from "@/components/base/app-button";
import { ModalHeader } from "@/components/base/modal-header";
import { ThemeType } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import {
  CustomFoodResponse,
  useCreateCustomFood,
  useCustomFoodSearch,
} from "@/services/customFoodService";
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import { MaterialIcons } from "@expo/vector-icons";
import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectedFoodResult {
  food_id: string;
  food_name: string;
  serving_id?: string;
  serving_description?: string;
  metric_serving_amount: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  is_custom?: boolean;
}

interface FoodSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onFoodSelected: (food: SelectedFoodResult) => void;
}

// ── Manual entry form ─────────────────────────────────────────────────────────

function ManualFoodForm({
  theme,
  style,
  onSave,
  onCancel,
  isSaving,
  feedback,
  onFeedback,
}: {
  theme: ThemeType;
  style: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSaving: boolean;
  feedback: ActionFeedback | null;
  onFeedback: (feedback: ActionFeedback | null) => void;
}) {
  const [name, setName] = useState("");
  const [servingDesc, setServingDesc] = useState("100g");
  const [gramation, setGramation] = useState("100");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const handleSave = () => {
    const missingField = !name.trim()
      ? "food name"
      : !calories
        ? "calories"
        : !protein
          ? "protein"
          : !carbs
            ? "carbohydrates"
            : !fat
              ? "fat"
              : null;
    if (missingField) {
      onFeedback({
        status: "error",
        title: "Required information",
        message: `Enter ${missingField}.`,
      });
      return;
    }

    onFeedback(null);
    onSave({
      food_name: name.trim(),
      serving_description: servingDesc.trim() || "100g",
      metric_serving_amount: parseFloat(gramation) || 100,
      calories: parseFloat(calories),
      protein: parseFloat(protein),
      carbohydrate: parseFloat(carbs),
      fat: parseFloat(fat),
      fiber: fiber ? parseFloat(fiber) : undefined,
      sodium: sodium ? parseFloat(sodium) : undefined,
    });
  };

  return (
    <View>
      {feedback ? (
        <ActionStatus
          {...feedback}
          onDismiss={() => onFeedback(null)}
        />
      ) : null}
      <View style={{ gap: 8, marginTop: 8 }}>
        <TextInput
          style={style.input}
          placeholder="Food name *"
          placeholderTextColor={theme.textLight}
          value={name}
          onChangeText={setName}
        />

        {/* Serving */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[style.input, { flex: 2 }]}
            placeholder="Serving description (e.g. 100g)"
            placeholderTextColor={theme.textLight}
            value={servingDesc}
            onChangeText={setServingDesc}
          />
          <TextInput
            style={[style.input, { flex: 1 }]}
            placeholder="Amount (g)"
            placeholderTextColor={theme.textLight}
            keyboardType="decimal-pad"
            value={gramation}
            onChangeText={setGramation}
          />
        </View>

        {/* Required macros */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[style.input, { flex: 1 }]}
            placeholder="Calories *"
            placeholderTextColor={theme.textLight}
            keyboardType="decimal-pad"
            value={calories}
            onChangeText={setCalories}
          />
          <TextInput
            style={[style.input, { flex: 1 }]}
            placeholder="Protein (g) *"
            placeholderTextColor={theme.textLight}
            keyboardType="decimal-pad"
            value={protein}
            onChangeText={setProtein}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[style.input, { flex: 1 }]}
            placeholder="Carbs (g) *"
            placeholderTextColor={theme.textLight}
            keyboardType="decimal-pad"
            value={carbs}
            onChangeText={setCarbs}
          />
          <TextInput
            style={[style.input, { flex: 1 }]}
            placeholder="Fat (g) *"
            placeholderTextColor={theme.textLight}
            keyboardType="decimal-pad"
            value={fat}
            onChangeText={setFat}
          />
        </View>

        {/* Optional macros toggle */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            showOptional
              ? "Hide optional nutrition fields"
              : "Show optional nutrition fields"
          }
          accessibilityState={{ expanded: showOptional }}
          onPress={() => setShowOptional(!showOptional)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            alignSelf: "flex-start",
          }}
        >
          <MaterialIcons
            name={showOptional ? "expand-less" : "expand-more"}
            size={16}
            color={theme.primary}
          />
          <Text style={[style.listMeta, { color: theme.primary }]}>
            {showOptional ? "Less" : "Add fiber & sodium"}
          </Text>
        </TouchableOpacity>

        {showOptional && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[style.input, { flex: 1 }]}
              placeholder="Fiber (g)"
              placeholderTextColor={theme.textLight}
              keyboardType="decimal-pad"
              value={fiber}
              onChangeText={setFiber}
            />
            <TextInput
              style={[style.input, { flex: 1 }]}
              placeholder="Sodium (mg)"
              placeholderTextColor={theme.textLight}
              keyboardType="decimal-pad"
              value={sodium}
              onChangeText={setSodium}
            />
          </View>
        )}
      </View>

      <AppButton
        label="Save & Use Food"
        loading={isSaving}
        onPress={handleSave}
        style={{ marginTop: 12 }}
      />
    </View>
  );
}

// ── Custom food row ───────────────────────────────────────────────────────────

function CustomFoodRowComponent({
  food,
  onSelect,
  theme,
  style,
}: {
  food: CustomFoodResponse;
  /** Takes the food itself so the parent can pass one stable callback. */
  onSelect: (food: CustomFoodResponse) => void;
  theme: any;
  style: any;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Select ${food.food_name}`}
      style={[
        style.listCard,
        { borderLeftWidth: 3, borderLeftColor: theme.primary },
      ]}
      activeOpacity={0.82}
      onPress={() => onSelect(food)}
    >
      <View style={style.exerciseHeader}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <Text style={style.listTitle}>{food.food_name}</Text>
            <View
              style={{
                backgroundColor: theme.primary + "20",
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: theme.primary,
                  fontWeight: "700",
                }}
              >
                MY FOOD
              </Text>
            </View>
          </View>
          <Text style={style.listMeta}>
            {food.serving_description ?? "100g"} · {food.calories?.toFixed(0)}{" "}
            kcal · P {food.protein?.toFixed(1)}g · C{" "}
            {food.carbohydrate?.toFixed(1)}g · F {food.fat?.toFixed(1)}g
          </Text>
        </View>
        <MaterialIcons
          name="add-circle-outline"
          size={22}
          color={theme.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Memoized so one row's press does not re-render the whole result list. Relies
 * on the parent keeping `style` and `onSelect` stable across renders.
 */
const CustomFoodRow = memo(CustomFoodRowComponent);

// ── Main modal ────────────────────────────────────────────────────────────────

export function FoodSearchModal({
  visible,
  onClose,
  onFoodSelected,
}: FoodSearchModalProps) {
  const { theme } = useTheme();
  // Memoized because CustomFoodRow is memoized: a fresh style object every
  // render would defeat the row's props comparison and re-render the whole list.
  const style = useMemo(() => gymStyles(theme), [theme]);

  const [search, setSearch] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [actionFeedback, setActionFeedback] =
    useState<ActionFeedback | null>(null);

  const createCustomMutation = useCreateCustomFood();

  // FatSecret search
  // const fatSecretQuery = useQuery({
  //   queryKey: ["fatsecret-search", search.trim()],
  //   queryFn: () => searchFatSecretFoods(search),
  //   enabled: search.trim().length >= 2,
  // });

  const customFoodQuery = useCustomFoodSearch(search.trim());

  const handleClose = useCallback(() => {
    setSearch("");
    setShowManual(false);
    setActionFeedback(null);
    onClose();
  }, [onClose]);

  // Stable identity so the memoized rows are not invalidated on every render.
  const handleCustomFoodSelect = useCallback((food: CustomFoodResponse) => {
    onFoodSelected({
      food_id: `custom-${food.id}`,
      food_name: food.food_name,
      serving_description: food.serving_description,
      metric_serving_amount: food.metric_serving_amount ?? 100,
      calories: food.calories,
      protein: food.protein,
      fat: food.fat,
      carbohydrate: food.carbohydrate,
      is_custom: true,
    });
    handleClose();
  }, [handleClose, onFoodSelected]);

  const handleManualSave = (data: any) => {
    setActionFeedback(null);
    createCustomMutation.mutate(data, {
      onSuccess: (saved) => {
        if (isOfflineQueuedResponse(saved)) {
          setActionFeedback({
            status: "info",
            title: "Custom food saved locally",
            message:
              "It can be added to this meal prep after synchronization completes.",
          });
          return;
        }
        handleCustomFoodSelect(saved);
      },
      onError: (error) =>
        setActionFeedback({
          status: "error",
          title: "Could not save custom food",
          message: toApiError(error).message,
        }),
    });
  };

  const isSearching = customFoodQuery.isFetching;
  const isAwaitingMinimumQuery = search.trim().length < 2;

  const customFoods = useMemo(
    () => (isSearching ? [] : (customFoodQuery.data ?? [])),
    [customFoodQuery.data, isSearching],
  );

  const keyExtractor = useCallback(
    (food: CustomFoodResponse) => String(food.id),
    [],
  );

  const renderCustomFood = useCallback(
    ({ item }: { item: CustomFoodResponse }) => (
      <CustomFoodRow
        food={item}
        onSelect={handleCustomFoodSelect}
        theme={theme}
        style={style}
      />
    ),
    [handleCustomFoodSelect, style, theme],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={style.modalBackdrop}>
        <View
          accessibilityViewIsModal
          style={[style.modalCard, { maxHeight: "90%" }]}
        >
          {/* Header */}
          <ModalHeader
            closeLabel="Close food search"
            onClose={handleClose}
            style={style.modalHeader}
            title={showManual ? "Add Custom Food" : "Find Food"}
          />

          {showManual ? (
            /* ── Manual entry form ─────────────────────────────────────── */
            <ScrollView showsVerticalScrollIndicator={false}>
              <ManualFoodForm
                theme={theme}
                style={style}
                onSave={handleManualSave}
                onCancel={() => {
                  setShowManual(false);
                  setActionFeedback(null);
                }}
                isSaving={createCustomMutation.isPending}
                feedback={actionFeedback}
                onFeedback={setActionFeedback}
              />
            </ScrollView>
          ) : (
            /* ── Search view ───────────────────────────────────────────── */
            <>
              <TextInput
                style={style.input}
                placeholder="Chicken rice, banana, egg..."
                placeholderTextColor={theme.textLight}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />

              <FlatList
                data={customFoods}
                keyExtractor={keyExtractor}
                renderItem={renderCustomFood}
                contentContainerStyle={{ gap: 8 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={7}
                // Element, not a component function: an inline arrow component
                // is a new type each render and would remount the header.
                ListHeaderComponent={
                  customFoods.length > 0 ? (
                    <Text
                      style={[
                        style.listMeta,
                        { fontWeight: "700", marginTop: 4 },
                      ]}
                    >
                      My Custom Foods
                    </Text>
                  ) : null
                }
                ListEmptyComponent={
                  isSearching ? (
                    <View style={style.loadingState}>
                      <ActivityIndicator color={theme.primary} />
                      <Text style={style.loadingText}>Searching foods...</Text>
                    </View>
                  ) : null
                }
                ListFooterComponent={
                  <>
                    {isAwaitingMinimumQuery && !isSearching ? (
                      <>
                        {customFoods.length > 0 ? (
                          <View
                            style={{
                              height: 0.5,
                              backgroundColor: theme.border ?? "#eee",
                            }}
                          />
                        ) : null}
                        <Text style={style.emptyText}>
                          Type at least 2 characters to search FatSecret.
                        </Text>
                      </>
                    ) : null}

                    {/* Add manually button — always visible at bottom */}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Add food manually"
                      style={[
                        style.filterChip,
                        {
                          alignSelf: "center",
                          marginTop: 8,
                          flexDirection: "row",
                          gap: 6,
                        },
                      ]}
                      onPress={() => {
                        setActionFeedback(null);
                        setShowManual(true);
                      }}
                    >
                      <MaterialIcons
                        name="add"
                        size={15}
                        color={theme.primary}
                      />
                      <Text
                        style={[style.filterChipText, { color: theme.primary }]}
                      >
                        Can&apos;t find it? Add manually
                      </Text>
                    </TouchableOpacity>
                  </>
                }
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
