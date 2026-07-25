import { ThemeType } from "@/constants/colors";
import { getNutritionAccents } from "@/constants/semantic-colors";
import { Text, View } from "react-native";

interface MealPrepMacroDonutProps {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  theme: ThemeType;
  style: any;
  size?: "sm" | "md";
}

function MacroSegmentedBar({
  protein,
  carbohydrate,
  fat,
  height = 28,
  theme,
  style,
}: {
  protein: number;
  carbohydrate: number;
  fat: number;
  height?: number;
  theme: ThemeType;
  style: any;
}) {
  const colors = getNutritionAccents(theme.background);
  const total = protein + carbohydrate + fat;

  const proteinPct = total > 0 ? (protein / total) * 100 : 0;
  const carbPct = total > 0 ? (carbohydrate / total) * 100 : 0;
  const fatPct = total > 0 ? (fat / total) * 100 : 0;

  const GAP = 3;
  const borderRadius = height / 2;
  const MIN_PCT_FOR_LABEL = 15;

  if (total === 0) {
    return (
      <View
        style={{
          height,
          borderRadius,
          backgroundColor: theme.border,
        }}
      />
    );
  }

  const renderSegmentLabel = (
    pct: number,
    value: number,
    label: string,
  ) =>
    pct >= MIN_PCT_FOR_LABEL ? (
      <View style={{ alignItems: "center", flexDirection: "row" }}>
        <Text
          style={[
            style.listMeta,
            { color: "#fff", fontSize: 11, fontWeight: "600", lineHeight: 14 },
          ]}
          numberOfLines={1}
        >
          {label + " "}
        </Text>
        <Text
          style={[
            style.heroStatValue,
            { color: "#fff", fontSize: 11, lineHeight: 14 },
          ]}
          numberOfLines={1}
        >
          {value.toFixed(1)}g
        </Text>
      </View>
    ) : null;

  return (
    <View
      style={{
        flexDirection: "row",
        height,
        borderRadius,
        overflow: "hidden",
        alignItems: "stretch",
      }}
    >
      <View
        style={{
          flex: proteinPct,
          backgroundColor: colors.protein,
          marginRight: GAP / 2,
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {renderSegmentLabel(proteinPct, protein, "Protein")}
      </View>
 
      <View
        style={{
          flex: carbPct,
          backgroundColor: colors.carbohydrate,
          marginHorizontal: GAP / 2,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {renderSegmentLabel(carbPct, carbohydrate, "Carbs")}
      </View>
 
      <View
        style={{
          flex: fatPct,
          backgroundColor: colors.fat,
          marginLeft: GAP / 2,
          borderTopRightRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {renderSegmentLabel(fatPct, fat, "Fat")}
      </View>
    </View>
  );
}

export function MealPrepMacroBar({
  protein,
  carbohydrate,
  fat,
  theme,
  style,
  size = "md",
}: MealPrepMacroDonutProps) {
  const isSmall = size === "sm";

  return (
    <View>
      <MacroSegmentedBar
        protein={protein}
        carbohydrate={carbohydrate}
        fat={fat}
        height={isSmall ? 10 : 20}
        theme={theme}
        style={style}
      />
    </View>
  );
}
