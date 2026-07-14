import { gymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import {
  CustomFoodResponse,
  useCreateCustomFood,
  useCustomFoodSearch,
} from "@/services/customFoodService";
import {
  FatSecretFoodDetail,
  FatSecretSearchFood,
  getFatSecretFood,
} from "@/services/foodDiaryService";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
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
}: {
  theme: ThemeType;
  style: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSaving: boolean;
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
  const { alert } = useAlert();

  const [showOptional, setShowOptional] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return alert("Required", "Enter a food name.");
    if (!calories) return alert("Required", "Enter calories.");
    if (!protein) return alert("Required", "Enter protein.");
    if (!carbs) return alert("Required", "Enter carbohydrates.");
    if (!fat) return alert("Required", "Enter fat.");

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

      <TouchableOpacity
        style={[style.primaryButton, { marginTop: 12 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={theme.white} />
        ) : (
          <Text style={style.primaryButtonText}>Save & Use Food</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Custom food row ───────────────────────────────────────────────────────────

function CustomFoodRow({
  food,
  onPress,
  theme,
  style,
}: {
  food: CustomFoodResponse;
  onPress: () => void;
  theme: any;
  style: any;
}) {
  return (
    <TouchableOpacity
      style={[
        style.listCard,
        { borderLeftWidth: 3, borderLeftColor: theme.primary },
      ]}
      activeOpacity={0.82}
      onPress={onPress}
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
                  fontSize: 10,
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

// ── Main modal ────────────────────────────────────────────────────────────────

export function FoodSearchModal({
  visible,
  onClose,
  onFoodSelected,
}: FoodSearchModalProps) {
  const { theme } = useTheme();
  const style = gymStyles(theme);
  const { alert } = useAlert();

  const [search, setSearch] = useState("");
  const [showManual, setShowManual] = useState(false);

  const createCustomMutation = useCreateCustomFood();

  // FatSecret search
  // const fatSecretQuery = useQuery({
  //   queryKey: ["fatsecret-search", search.trim()],
  //   queryFn: () => searchFatSecretFoods(search),
  //   enabled: search.trim().length >= 2,
  // });

  const customFoodQuery = useCustomFoodSearch(search.trim());

  // FatSecret detail fetch
  const foodDetailMutation = useMutation({
    mutationFn: (food: FatSecretSearchFood) => getFatSecretFood(food.food_id),
    onSuccess: (food: FatSecretFoodDetail) => {
      const serving = food.serving;
      onFoodSelected({
        food_id: food.food_id,
        food_name: food.food_name,
        serving_id: serving?.serving_id,
        serving_description: serving?.serving_description,
        metric_serving_amount:
          parseFloat(serving?.metric_serving_amount ?? "100") || 100,
        calories: parseFloat(serving?.calories ?? "0") || 0,
        protein: parseFloat(serving?.protein ?? "0") || 0,
        fat: parseFloat(serving?.fat ?? "0") || 0,
        carbohydrate: parseFloat(serving?.carbohydrate ?? "0") || 0,
        is_custom: false,
      });
      handleClose();
    },
    onError: (e: any) => alert("Food detail failed", e.message),
  });

  const handleCustomFoodSelect = (food: CustomFoodResponse) => {
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
  };

  const handleManualSave = (data: any) => {
    createCustomMutation.mutate(data, {
      onSuccess: (saved: CustomFoodResponse) => {
        handleCustomFoodSelect(saved);
        alert("Saved!", `"${saved.food_name}" saved to your custom foods.`);
      },
      onError: (e: any) => alert("Save failed", e.message),
    });
  };

  const handleClose = () => {
    setSearch("");
    setShowManual(false);
    onClose();
  };

  const hasCustomResults = (customFoodQuery.data?.length ?? 0) > 0;
  const isSearching = customFoodQuery.isFetching;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={style.modalBackdrop}>
        <View style={[style.modalCard, { maxHeight: "90%" }]}>
          {/* Header */}
          <View style={style.modalHeader}>
            <Text style={style.modalTitle}>
              {showManual ? "Add Custom Food" : "Find Food"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={22} color={theme.textBlack} />
            </TouchableOpacity>
          </View>

          {showManual ? (
            /* ── Manual entry form ─────────────────────────────────────── */
            <ScrollView showsVerticalScrollIndicator={false}>
              <ManualFoodForm
                theme={theme}
                style={style}
                onSave={handleManualSave}
                onCancel={() => setShowManual(false)}
                isSaving={createCustomMutation.isPending}
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

              <ScrollView
                contentContainerStyle={{ gap: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {isSearching ? (
                  <View style={style.loadingState}>
                    <ActivityIndicator color={theme.primary} />
                    <Text style={style.loadingText}>Searching foods...</Text>
                  </View>
                ) : search.trim().length < 2 ? (
                  <>
                    {/* Show all custom foods when no search */}
                    {(customFoodQuery.data?.length ?? 0) > 0 && (
                      <>
                        <Text
                          style={[
                            style.listMeta,
                            { fontWeight: "700", marginTop: 4 },
                          ]}
                        >
                          My Custom Foods
                        </Text>
                        {customFoodQuery.data?.map(
                          (food: CustomFoodResponse) => (
                            <CustomFoodRow
                              key={food.id}
                              food={food}
                              onPress={() => handleCustomFoodSelect(food)}
                              theme={theme}
                              style={style}
                            />
                          ),
                        )}
                        <View
                          style={{
                            height: 0.5,
                            backgroundColor: theme.border ?? "#eee",
                          }}
                        />
                      </>
                    )}
                    <Text style={style.emptyText}>
                      Type at least 2 characters to search FatSecret.
                    </Text>
                  </>
                ) : (
                  <>
                    {hasCustomResults && (
                      <>
                        <Text
                          style={[
                            style.listMeta,
                            { fontWeight: "700", marginTop: 4 },
                          ]}
                        >
                          My Custom Foods
                        </Text>
                        {customFoodQuery.data?.map(
                          (food: CustomFoodResponse) => (
                            <CustomFoodRow
                              key={food.id}
                              food={food}
                              onPress={() => handleCustomFoodSelect(food)}
                              theme={theme}
                              style={style}
                            />
                          ),
                        )}
                        {/* {hasFatSecretResults && (
                          <View
                            style={{
                              height: 0.5,
                              backgroundColor: theme.border ?? "#eee",
                              marginVertical: 4,
                            }}
                          />
                        )} */}
                      </>
                    )}

                    {/* FatSecret results */}
                    {/* {hasFatSecretResults ? (
                      <>
                        {hasCustomResults && (
                          <Text style={[style.listMeta, { fontWeight: "700" }]}>
                            FatSecret
                          </Text>
                        )}
                        {fatSecretQuery.data?.map((food) => (
                          <TouchableOpacity
                            key={food.food_id}
                            style={style.listCard}
                            activeOpacity={0.82}
                            onPress={() => foodDetailMutation.mutate(food)}
                            disabled={foodDetailMutation.isPending}
                          >
                            <View style={style.exerciseHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={style.listTitle}>
                                  {food.food_name}
                                </Text>
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
                                <ActivityIndicator
                                  size="small"
                                  color={theme.primary}
                                />
                              ) : (
                                <MaterialIcons
                                  name="add-circle-outline"
                                  size={22}
                                  color={theme.primary}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : !hasCustomResults ? (
                      <Text style={style.emptyText}>
                        No foods found on FatSecret.
                      </Text>
                    ) : null} */}
                  </>
                )}

                {/* Add manually button — always visible at bottom */}
                <TouchableOpacity
                  style={[
                    style.filterChip,
                    {
                      alignSelf: "center",
                      marginTop: 8,
                      flexDirection: "row",
                      gap: 6,
                    },
                  ]}
                  onPress={() => setShowManual(true)}
                >
                  <MaterialIcons name="add" size={15} color={theme.primary} />
                  <Text
                    style={[style.filterChipText, { color: theme.primary }]}
                  >
                    Can&apos;t find it? Add manually
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
