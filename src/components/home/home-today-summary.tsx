import { FadeSlideIn } from "@/components/animations/fade-slide-in";
import { SectionLabel } from "@/components/base/SectionLabel";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ShimmerSkeleton } from "@/components/base/shimmer-skeleton";
import { getNutritionAccents } from "@/constants/semantic-colors";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const WATER_GOAL_ML = 2000;

type NutritionMetric = {
  consumed?: number;
  goal?: number;
  percentage?: number;
};

type DailyNutritionProgress = {
  calories?: NutritionMetric;
  protein?: NutritionMetric;
};

type HomeTodaySummaryProps = {
  nutrition?: DailyNutritionProgress;
  isLoading: boolean;
  waterAmount: number;
  waterUpdating: boolean;
  hasActiveSession: boolean;
  activeProgramName?: string;
  trainingDaysThisWeek: number;
  onWaterChange: (increment: number) => void;
  onLogFood: () => void;
  onOpenNutritionGoals: () => void;
};

type MetricProps = {
  label: string;
  value: string;
  supporting: string;
  percentage: number;
  accentColor: string;
};

const formatCompactNumber = (value: number, suffix = "") =>
  `${Math.round(value).toLocaleString()}${suffix}`;

const clampPercentage = (value?: number) =>
  Math.max(0, Math.min(value ?? 0, 100));

function TodayMetric({
  label,
  value,
  supporting,
  percentage,
  accentColor,
}: MetricProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: accentColor + "0D",
          borderColor: accentColor + "24",
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: accentColor }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricSupporting, { color: theme.textLight }]}>
        {supporting}
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: accentColor,
              width: `${clampPercentage(percentage)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function HomeSummarySkeleton() {
  return (
    <View
      style={styles.metricGrid}
      accessibilityLabel="Loading today's summary"
    >
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.metric}>
          <ShimmerSkeleton width={60} height={9} />
          <ShimmerSkeleton width={72} height={20} />
          <ShimmerSkeleton width={56} height={9} />
          <ShimmerSkeleton height={5} borderRadius={3} />
        </View>
      ))}
    </View>
  );
}

export function HomeTodaySummary({
  nutrition,
  isLoading,
  waterAmount,
  waterUpdating,
  hasActiveSession,
  activeProgramName,
  trainingDaysThisWeek,
  onWaterChange,
  onLogFood,
  onOpenNutritionGoals,
}: HomeTodaySummaryProps) {
  const { theme } = useTheme();
  const nutritionAccents = getNutritionAccents(theme.background);

  return (
    <>
      <SectionLabel>Today</SectionLabel>
      <FadeSlideIn delay={80}>
        <ShadowGlowCard>
          {isLoading ? (
            <HomeSummarySkeleton />
          ) : (
            <View style={styles.metricGrid}>
              <TodayMetric
                accentColor={nutritionAccents.calories}
                label="Calories"
                value={formatCompactNumber(nutrition?.calories?.consumed ?? 0)}
                supporting={`of ${formatCompactNumber(nutrition?.calories?.goal ?? 0)}`}
                percentage={nutrition?.calories?.percentage ?? 0}
              />
              <TodayMetric
                accentColor={nutritionAccents.protein}
                label="Protein"
                value={formatCompactNumber(
                  nutrition?.protein?.consumed ?? 0,
                  "g",
                )}
                supporting={`of ${formatCompactNumber(nutrition?.protein?.goal ?? 0, "g")}`}
                percentage={nutrition?.protein?.percentage ?? 0}
              />
              <TodayMetric
                accentColor={nutritionAccents.water}
                label="Water"
                value={
                  waterAmount >= 1000
                    ? `${(waterAmount / 1000).toFixed(1)}L`
                    : `${waterAmount}ml`
                }
                supporting={`of ${WATER_GOAL_ML / 1000}L`}
                percentage={(waterAmount / WATER_GOAL_ML) * 100}
              />
              <TodayMetric
                accentColor={theme.primary}
                label="Training"
                value={hasActiveSession ? "Active" : "Not started"}
                supporting={
                  activeProgramName ?? `${trainingDaysThisWeek} days this week`
                }
                percentage={(trainingDaysThisWeek / 7) * 100}
              />
            </View>
          )}

          <View
            style={[styles.waterControls, { borderTopColor: theme.border }]}
          >
            <View style={styles.waterControlLabel}>
              <MaterialCommunityIcons
                name="water"
                size={17}
                color={nutritionAccents.water}
              />
              <Text style={[styles.waterControlText, { color: theme.text }]}>
                Log water
              </Text>
            </View>
            <View style={styles.waterButtons}>
              {[
                { label: "−250", increment: -250 },
                { label: "+250", increment: 250 },
                { label: "+500", increment: 500 },
              ].map((action) => {
                const disabled =
                  waterUpdating ||
                  (action.increment < 0 && waterAmount <= 0);
                return (
                  <TouchableOpacity
                    accessibilityLabel={`${action.label} milliliters of water`}
                    accessibilityRole="button"
                    accessibilityState={{ busy: waterUpdating, disabled }}
                    activeOpacity={0.7}
                    disabled={disabled}
                    key={action.label}
                    onPress={() => onWaterChange(action.increment)}
                    style={[
                      styles.waterButton,
                      {
                        backgroundColor: nutritionAccents.water + "10",
                        borderColor: nutritionAccents.water + "30",
                        opacity: disabled ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.waterButtonText,
                        { color: nutritionAccents.water },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View
            style={[styles.summaryActions, { borderTopColor: theme.border }]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Log food"
              hitSlop={8}
              onPress={onLogFood}
            >
              <Text style={[styles.inlineAction, { color: theme.primary }]}>
                Log food
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open nutrition goals"
              hitSlop={8}
              onPress={onOpenNutritionGoals}
            >
              <Text style={[styles.inlineAction, { color: theme.primary }]}>
                Nutrition goals
              </Text>
            </TouchableOpacity>
          </View>
        </ShadowGlowCard>
      </FadeSlideIn>
    </>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  metric: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 10,
    width: "48.5%",
  },
  metricLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  metricValue: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 19,
    fontVariant: ["tabular-nums"],
  },
  metricSupporting: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  progressTrack: {
    borderRadius: 3,
    height: 5,
    marginTop: 3,
    overflow: "hidden",
  },
  progressFill: { borderRadius: 3, height: "100%" },
  summaryActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 20,
    marginTop: 18,
    paddingHorizontal: 6,
    paddingTop: 14,
  },
  waterControls: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 18,
    paddingHorizontal: 6,
    paddingTop: 14,
  },
  waterControlLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  waterControlText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
  waterButtons: {
    flexDirection: "row",
    gap: 6,
  },
  waterButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 48,
    paddingHorizontal: 8,
  },
  waterButtonText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  inlineAction: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
  },
});
