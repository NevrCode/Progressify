import type { GymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import {
  getNutritionAccents,
  getThemeSemantics,
} from "@/constants/semantic-colors";
import { DailyMacroProgress } from "@/services/nutritionService";
import { Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MacroDonutChartProps {
  progress: DailyMacroProgress;
  theme: ThemeType;
  style: GymStyles;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MACRO_LABELS = {
  protein: "Protein",
  carbohydrate: "Carbs",
  fat: "Fat",
};

// ── Legend item ───────────────────────────────────────────────────────────────

function LegendItem({
  color,
  label,
  consumed,
  goal,
  unit = "g",
  theme,
  style,
}: {
  color: string;
  label: string;
  consumed: number;
  goal: number;
  unit?: string;
  theme: ThemeType;
  style: GymStyles;
}) {
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          marginBottom: 4,
        }}
      />
      <Text style={[style.listMeta, { fontWeight: "700", color }]}>
        {label}
      </Text>
      <View style={{ flexDirection: "row" }}>
        <Text style={[style.heroStatValue, { fontSize: 15 }]}>
          {consumed.toFixed(0)}
        </Text>
        <Text style={style.listMeta}>
          {" "}
          / {goal.toFixed(0)}
          {unit}
        </Text>
      </View>
      <Text
        style={[style.listMeta, { color, fontWeight: "700", marginTop: 2 }]}
      >
        {pct.toFixed(0)}%
      </Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MacroDonutChart({
  progress,
  theme,
  style,
}: MacroDonutChartProps) {
  const macroColors = getNutritionAccents(theme.background);
  const semantics = getThemeSemantics(theme);
  const p = progress.protein.consumed;
  const c = progress.carbohydrate.consumed;
  const f = progress.fat.consumed;
  const total = p + c + f;

  // Build donut data — show remaining slice if not full
  const donutData =
    total > 0
      ? [
          {
            value: p,
            color: macroColors.protein,
            text: "",
          },
          {
            value: c,
            color: macroColors.carbohydrate,
            text: "",
          },
          {
            value: f,
            color: macroColors.fat,
            text: "",
          },
        ]
      : [
          {
            value: 1,
            color: theme.border,
            text: "",
          },
        ];

  const centerLabel = (
    <View style={{ alignItems: "center" }}>
      <Text style={[style.listMeta, { fontSize: 11 }]}>CONSUMED</Text>
      <Text style={[style.heroStatValue, { fontSize: 22 }]}>
        {progress.calories.consumed.toFixed(0)}
      </Text>
      <Text style={[style.listMeta, { fontSize: 11 }]}>kcal</Text>
    </View>
  );

  return (
    <>
      {/* Donut chart centered */}
      <View style={{ alignItems: "center", marginVertical: 12 }}>
        <PieChart
          data={donutData}
          donut
          radius={70}
          innerRadius={50}
          gradientCenterColor={theme.background}
          innerCircleColor={theme.card}
          centerLabelComponent={() => centerLabel}
          strokeWidth={3}
          strokeColor={theme.card ?? "#fff"}
          animationDuration={600}
        />
      </View>

      {/* Legend row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
          // paddingHorizontal: 8,
        }}
      >
        <LegendItem
          color={macroColors.protein}
          label={MACRO_LABELS.protein}
          consumed={progress.protein.consumed}
          goal={progress.protein.goal}
          theme={theme}
          style={style}
        />
        <View
          style={{
            width: 1,
            backgroundColor: theme.border ?? "#eee",
            marginVertical: 4,
          }}
        />
        <LegendItem
          color={macroColors.carbohydrate}
          label={MACRO_LABELS.carbohydrate}
          consumed={progress.carbohydrate.consumed}
          goal={progress.carbohydrate.goal}
          theme={theme}
          style={style}
        />
        <View
          style={{
            width: 1,
            backgroundColor: theme.border ?? "#eee",
            marginVertical: 4,
          }}
        />
        <LegendItem
          color={macroColors.fat}
          label={MACRO_LABELS.fat}
          consumed={progress.fat.consumed}
          goal={progress.fat.goal}
          theme={theme}
          style={style}
        />
      </View>

      {/* Calorie progress bar below */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text style={style.listMeta}>Calorie goal</Text>
        <Text style={style.listMeta}>
          {progress.calories.remaining.toFixed(0)} kcal remaining
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.border ?? "#eee",
        }}
      >
        <View
          style={{
            height: 8,
            borderRadius: 4,
            width: `${Math.min(progress.calories.percentage, 100)}%`,
            backgroundColor:
              progress.calories.percentage > 110
                ? semantics.danger
                : progress.calories.percentage >= 85
                  ? semantics.success
                  : theme.primary,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <Text style={[style.listMeta, { fontSize: 11 }]}>
          {progress.calories.consumed.toFixed(0)} kcal eaten
        </Text>
        <Text style={[style.listMeta, { fontSize: 11 }]}>
          {progress.calories.goal.toFixed(0)} kcal goal
        </Text>
      </View>
    </>
  );
}
