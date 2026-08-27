import { IconButton } from "@/components/base/icon-button";
import { ThemeType } from "@/constants/colors";
import { FONT_FAMILIES } from "@/constants/typography";
import { FoodEntryDetailResponseDTO } from "@/services/foodDiaryService";
import { MaterialIcons } from "@expo/vector-icons";
import type { StyleProp, TextStyle } from "react-native";
import { Text, View } from "react-native";

type MealListStyles = {
  listTitle: StyleProp<TextStyle>;
  listMeta: StyleProp<TextStyle>;
};

type FoodDiaryMealListProps = {
  entries: FoodEntryDetailResponseDTO[];
  onDelete: (entry: FoodEntryDetailResponseDTO) => void;
  theme: ThemeType;
  styles: MealListStyles;
};

const mealColors: Record<string, string> = {
  BREAKFAST: "#f69f1d",
  LUNCH: "#0090FF",
  DINNER: "#2514df",
  SNACK: "#1D9E75",
};

const mealOrder = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

function MacroPill({
  label,
  value,
  unit,
  backgroundColor,
  color,
}: {
  label: string;
  value?: number;
  unit: string;
  backgroundColor: string;
  color: string;
}) {
  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
        {label}
        {label ? " " : ""}
        {value !== undefined
          ? unit.includes("kcal")
            ? value.toFixed(0)
            : value.toFixed(1)
          : "0"}
        {unit}
      </Text>
    </View>
  );
}

function FoodEntryCard({
  entry,
  onDelete,
  theme,
  styles,
}: {
  entry: FoodEntryDetailResponseDTO;
  onDelete: (entry: FoodEntryDetailResponseDTO) => void;
  theme: ThemeType;
  styles: MealListStyles;
}) {
  const mealColor = mealColors[entry.meal_type] ?? theme.primary;

  return (
    <View
      style={{
        backgroundColor: theme.card ?? "#ffffff",
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: theme.border ?? "#eee",
        borderLeftWidth: 3.5,
        borderLeftColor: mealColor,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={[
            styles.listTitle,
            {
              marginBottom: 0,
              fontWeight: "600",
              fontSize: 13.5,
              fontFamily: FONT_FAMILIES.semibold,
            },
          ]}
        >
          {entry.food_name}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          <MacroPill
            label=""
            value={entry.calories}
            unit=" kcal"
            backgroundColor="#FAEEDA"
            color="#633806"
          />
          <MacroPill
            label="P"
            value={entry.protein}
            unit="g"
            backgroundColor="#E6F1FB"
            color="#0C447C"
          />
          <MacroPill
            label="C"
            value={entry.carbohydrate}
            unit="g"
            backgroundColor="#EAF3DE"
            color="#27500A"
          />
          <MacroPill
            label="F"
            value={entry.fat}
            unit="g"
            backgroundColor="#FAECE7"
            color="#712B13"
          />
          <Text
            style={[
              styles.listMeta,
              { alignSelf: "center", fontSize: 11, fontWeight: "500" },
            ]}
          >
            · {entry.quantity}g
          </Text>
        </View>
      </View>

      <IconButton
        accessibilityLabel={`Delete ${entry.food_name || "food entry"}`}
        variant="destructive"
        onPress={() => onDelete(entry)}
        icon={
          <MaterialIcons
            name="delete-outline"
            size={17}
            color={theme.expense ?? "#A32D2D"}
          />
        }
      />
    </View>
  );
}

export function FoodDiaryMealList({
  entries,
  onDelete,
  theme,
  styles,
}: FoodDiaryMealListProps) {
  const grouped = entries.reduce<Record<string, FoodEntryDetailResponseDTO[]>>(
    (accumulator, entry) => {
      const meal = entry.meal_type ?? "OTHER";
      accumulator[meal] = [...(accumulator[meal] ?? []), entry];
      return accumulator;
    },
    {},
  );
  const sortedMeals = Object.keys(grouped).sort(
    (left, right) => mealOrder.indexOf(left) - mealOrder.indexOf(right),
  );

  return (
    <>
      {sortedMeals.map((meal) => {
        const mealEntries = grouped[meal];
        const totalCalories = mealEntries.reduce(
          (sum, entry) => sum + (entry.calories ?? 0),
          0,
        );

        return (
          <View key={meal} style={{ marginBottom: 14 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={[
                  styles.listTitle,
                  {
                    marginBottom: 0,
                    fontWeight: "700",
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_700Bold",
                  },
                ]}
              >
                {meal.charAt(0) + meal.slice(1).toLowerCase()}
              </Text>
              <View
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 0.5,
                  borderColor: theme.border ?? "#eee",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.textLight,
                    fontFamily: FONT_FAMILIES.semibold,
                  }}
                >
                  {mealEntries.length} item{mealEntries.length !== 1 ? "s" : ""} · {totalCalories.toFixed(0)} kcal
                </Text>
              </View>
            </View>

            {mealEntries.map((entry) => (
              <FoodEntryCard
                key={entry.id}
                entry={entry}
                onDelete={onDelete}
                theme={theme}
                styles={styles}
              />
            ))}
          </View>
        );
      })}
    </>
  );
}
