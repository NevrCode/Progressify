import { gymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import { type CustomFoodResponse } from "@/services/customFoodService";
import { MaterialIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type GymStyles = ReturnType<typeof gymStyles>;

export type DiscoverableCustomFood = CustomFoodResponse & {
  resource_type: "food";
  resource_id: string;
};

type CustomFoodRowProps = {
  food: DiscoverableCustomFood;
  favorite: boolean;
  onSelect: (food: DiscoverableCustomFood) => void;
  onToggleFavorite: (food: DiscoverableCustomFood, favorite: boolean) => void;
  onDelete: (food: DiscoverableCustomFood) => void;
  styles: GymStyles;
  theme: ThemeType;
};

/**
 * A single custom food in the search results.
 *
 * Purely presentational — the delete confirmation lives in the parent so this
 * row holds no dialog or mutation state. Memoized so that toggling one food's
 * favorite flag does not re-render every other row; that requires the parent to
 * keep `styles` and all three callbacks stable across renders.
 */
function CustomFoodRowComponent({
  food,
  favorite,
  onSelect,
  onToggleFavorite,
  onDelete,
  styles,
  theme,
}: CustomFoodRowProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Select ${food.food_name}`}
      style={styles.listCard}
      onPress={() => onSelect(food)}
    >
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>{food.food_name}</Text>
          <Text style={styles.listMeta}>
            {food.serving_description || "1 serving"} • {food.calories} kcal
          </Text>
          <Text style={styles.listSubtle}>
            P: {food.protein}g • C: {food.carbohydrate}g • F: {food.fat}g
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${favorite ? "Remove" : "Add"} ${food.food_name} ${favorite ? "from" : "to"} favorite foods`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite(food, !favorite);
            }}
          >
            <MaterialIcons
              name={favorite ? "star" : "star-border"}
              size={21}
              color={favorite ? theme.primary : theme.textLight}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Delete custom food ${food.food_name}`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onDelete(food);
            }}
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
  );
}

export const CustomFoodRow = memo(CustomFoodRowComponent);
