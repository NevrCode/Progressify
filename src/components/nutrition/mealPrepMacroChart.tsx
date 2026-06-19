import { Text, View } from "react-native";

interface MealPrepMacroDonutProps {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  theme: any;
  style: any;
  size?: "sm" | "md";
}

const COLORS = {
  protein: "#3498db",
  carbohydrate: "#2ecc71",
  fat: "#e74c3c",
  empty: "#646464",
};

function MacroSegmentedBar({
  protein,
  carbohydrate,
  fat,
  height = 28,
  style,
}: {
  protein: number;
  carbohydrate: number;
  fat: number;
  height?: number;
  theme: any;
  style: any;
}) {
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
          backgroundColor: COLORS.empty,
          opacity: 0.1,
        }}
      />
    );
  }

  const SegmentLabel = ({
    pct,
    value,
    label,
  }: {
    pct: number;
    value: number;
    label: string;
  }) =>
    pct >= MIN_PCT_FOR_LABEL ? (
      <View style={{ alignItems: "center", flexDirection: "row" }}>
        <Text
          style={[
            style.listMeta,
            { color: "#fff", fontSize: 10, fontWeight: "600", lineHeight: 13 },
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
          backgroundColor: COLORS.protein,
          marginRight: GAP / 2,
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <SegmentLabel pct={proteinPct} value={protein} label="Protein" />
      </View>

      <View
        style={{
          flex: carbPct,
          backgroundColor: COLORS.carbohydrate,
          marginHorizontal: GAP / 2,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <SegmentLabel pct={carbPct} value={carbohydrate} label="Carbs" />
      </View>

      <View
        style={{
          flex: fatPct,
          backgroundColor: COLORS.fat,
          marginLeft: GAP / 2,
          borderTopRightRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <SegmentLabel pct={fatPct} value={fat} label="Fat" />
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
