import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { FONT_FAMILIES } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import type { WeeklyReview, WeeklyReviewMetric } from "@/utils/weekly-review";
import { StyleSheet, Text, View } from "react-native";

type WeeklyReviewCardProps = {
  review: WeeklyReview;
  nutritionHistoryLoading?: boolean;
};

const compactNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toLocaleString();
};

const comparisonLabel = (
  metric: WeeklyReviewMetric,
  unit: string,
  usePercentage = false,
) => {
  if (usePercentage && metric.percentageChange !== undefined) {
    const rounded = Math.round(metric.percentageChange);
    if (rounded === 0) return "No meaningful change";
    return `${rounded > 0 ? "+" : ""}${rounded}% vs prior week`;
  }
  if (metric.difference === 0) return "Same as prior week";
  return `${metric.difference > 0 ? "+" : ""}${metric.difference} ${unit}`;
};

export function WeeklyReviewCard({
  review,
  nutritionHistoryLoading = false,
}: WeeklyReviewCardProps) {
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);

  return (
    <ShadowGlowCard
      accessibilityLabel={`Weekly review, ${review.currentPeriodLabel} compared with ${review.previousPeriodLabel}`}
      style={styles.card}
    >
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.textBlack }]}
          >
            Weekly review
          </Text>
          <Text selectable style={[styles.period, { color: theme.textLight }]}>
            {review.currentPeriodLabel} vs {review.previousPeriodLabel}
          </Text>
        </View>
      </View>

      <Text selectable style={[styles.summary, { color: theme.text }]}>
        {review.summary}
      </Text>

      <View style={styles.metrics}>
        <View
          accessibilityLabel={`${review.trainingDays.current} training days, ${comparisonLabel(
            review.trainingDays,
            "days vs prior week",
          )}`}
          style={[
            styles.metric,
            {
              backgroundColor: theme.primary + "0D",
              borderColor: theme.primary + "24",
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: theme.primary }]}>
            Training days
          </Text>
          <Text selectable style={[styles.metricValue, { color: theme.text }]}>
            {review.trainingDays.current}
          </Text>
          <Text style={[styles.metricDelta, { color: theme.textLight }]}>
            {comparisonLabel(review.trainingDays, "days vs prior week")}
          </Text>
        </View>

        <View
          accessibilityLabel={`${compactNumber(
            review.trainingVolume.current,
          )} kilograms recorded volume, ${comparisonLabel(
            review.trainingVolume,
            "kg",
            true,
          )}`}
          style={[
            styles.metric,
            {
              backgroundColor: semantics.info + "0D",
              borderColor: semantics.info + "24",
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: semantics.info }]}>
            Set volume
          </Text>
          <Text selectable style={[styles.metricValue, { color: theme.text }]}>
            {compactNumber(review.trainingVolume.current)}
          </Text>
          <Text style={[styles.metricDelta, { color: theme.textLight }]}>
            {comparisonLabel(review.trainingVolume, "kg", true)}
          </Text>
        </View>

        {review.diaryDays ? (
          <View
            accessibilityLabel={`${review.diaryDays.current} food diary days, ${comparisonLabel(
              review.diaryDays,
              "days vs prior week",
            )}`}
            style={[
              styles.metric,
              styles.fullMetric,
              {
                backgroundColor: semantics.success + "0D",
                borderColor: semantics.success + "24",
              },
            ]}
          >
            <View style={styles.diaryRow}>
              <View style={styles.headingText}>
                <Text
                  style={[styles.metricLabel, { color: semantics.success }]}
                >
                  Food diary days
                </Text>
                <Text style={[styles.metricDelta, { color: theme.textLight }]}>
                  {comparisonLabel(review.diaryDays, "days vs prior week")}
                </Text>
              </View>
              <Text
                selectable
                style={[styles.metricValue, { color: theme.text }]}
              >
                {review.diaryDays.current}
              </Text>
            </View>
          </View>
        ) : nutritionHistoryLoading ? (
          <Text style={[styles.note, { color: theme.textLight }]}>
            Checking nutrition history…
          </Text>
        ) : (
          <Text style={[styles.note, { color: theme.textLight }]}>
            More diary history is needed for an exact two-week nutrition
            comparison.
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.formulaNote,
          { color: theme.textLight, borderTopColor: theme.border },
        ]}
      >
        Set volume is calculated from weight × reps across recorded sets.
      </Text>
    </ShadowGlowCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headingText: {
    flex: 1,
    gap: 2,
  },
  icon: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    fontFamily: FONT_FAMILIES.extraBold,
    fontSize: 15,
  },
  period: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: 10,
  },
  summary: {
    fontFamily: FONT_FAMILIES.semibold,
    fontSize: 12,
    lineHeight: 18,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 10,
    width: "48.5%",
  },
  fullMetric: {
    width: "100%",
  },
  metricLabel: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metricValue: {
    fontFamily: FONT_FAMILIES.extraBold,
    fontSize: 21,
    fontVariant: ["tabular-nums"],
  },
  metricDelta: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  diaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  note: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 2,
    width: "100%",
  },
  formulaNote: {
    borderTopWidth: StyleSheet.hairlineWidth,
    fontFamily: FONT_FAMILIES.medium,
    fontSize: 10,
    lineHeight: 15,
    paddingTop: 10,
  },
});
