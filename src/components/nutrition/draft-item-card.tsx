import type { GymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import type { MealPrepItemRequest } from "@/services/mealPrepService";
import { MacroPill } from "./macro-pill";
import { MaterialIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export type DraftItem = MealPrepItemRequest & { key: string };

const parseNumber = (v?: string | number) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

type DraftItemCardProps = {
  item: DraftItem;
  accentColor: string;
  theme: ThemeType;
  styles: GymStyles;
  onEdit: (key: string) => void;
  onRemove: (key: string) => void;
  onChangeGramation: (key: string, value: string) => void;
};

/**
 * One food item in the meal-prep create/edit form: name, gramation input,
 * macro pills, and edit/remove actions.
 *
 * Memoized so typing a gramation value for one item does not re-render every
 * other item card in the list — `draftItems` is a flat array in one
 * `useState`, so without this every keystroke re-renders the whole list.
 */
function DraftItemCardComponent({
  item,
  accentColor,
  theme,
  styles,
  onEdit,
  onRemove,
  onChangeGramation,
}: DraftItemCardProps) {
  return (
    <View
      style={[styles.draftItemCard, { borderLeftColor: accentColor }]}
    >
      <View style={styles.draftItemHeaderRow}>
        <View style={styles.flexOne}>
          <Text style={styles.listTitle}>{item.food_name}</Text>
          <Text style={styles.listMeta}>{item.serving_description}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.food_name}`}
          hitSlop={9}
          onPress={() => onEdit(item.key)}
        >
          <MaterialIcons name="edit" size={17} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.food_name} from meal prep`}
          hitSlop={9}
          onPress={() => onRemove(item.key)}
          style={styles.draftItemRemoveButton}
        >
          <MaterialIcons name="delete-outline" size={17} color="#A32D2D" />
        </TouchableOpacity>
      </View>
      <TextInput
        accessibilityLabel={`${item.food_name} amount in grams`}
        style={[styles.input, styles.inputSpacingTop8]}
        keyboardType="decimal-pad"
        placeholder="Gramation (g)"
        placeholderTextColor={theme.textLight}
        value={String(item.gramation)}
        onChangeText={(value) => onChangeGramation(item.key, value)}
      />
      <View style={styles.draftItemMacroRow}>
        <MacroPill
          label=""
          value={parseNumber(item.calories)}
          unit=" kcal"
          bg="#FAEEDA"
          color="#633806"
          styles={styles}
        />
        <MacroPill
          label="P"
          value={parseNumber(item.protein)}
          unit="g"
          bg="#E6F1FB"
          color="#0C447C"
          styles={styles}
        />
        <MacroPill
          label="C"
          value={parseNumber(item.carbohydrate)}
          unit="g"
          bg="#EAF3DE"
          color="#27500A"
          styles={styles}
        />
        <MacroPill
          label="F"
          value={parseNumber(item.fat)}
          unit="g"
          bg="#FAECE7"
          color="#712B13"
          styles={styles}
        />
      </View>
    </View>
  );
}

export const DraftItemCard = memo(DraftItemCardComponent);
