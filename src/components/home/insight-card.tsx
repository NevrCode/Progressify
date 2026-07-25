import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { FONT_FAMILIES } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import type { HomeInsight, InsightTone } from "@/utils/home-insights";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type InsightCardProps = {
  insight: HomeInsight;
  onPress: () => void;
};

const iconForTone = (tone: InsightTone) => {
  switch (tone) {
    case "positive":
      return "trending-up";
    case "warning":
      return "alert-circle-outline";
    case "info":
      return "lightbulb-outline";
    default:
      return "chart-line";
  }
};

export function InsightCard({ insight, onPress }: InsightCardProps) {
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const [explanationVisible, setExplanationVisible] = useState(false);
  const accent =
    insight.tone === "positive"
      ? semantics.success
      : insight.tone === "warning"
        ? semantics.warning
        : insight.tone === "info"
          ? semantics.info
          : theme.textLight;

  return (
    <ShadowGlowCard
      accessibilityLabel={`${insight.category} insight: ${insight.title}`}
      style={styles.card}
    >
      <View style={styles.heading}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor: accent + "14",
              borderColor: accent + "30",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={iconForTone(insight.tone)}
            size={20}
            color={accent}
          />
        </View>
        <View style={styles.titleGroup}>
          <Text style={[styles.category, { color: accent }]}>
            {insight.category}
          </Text>
          <Text style={[styles.title, { color: theme.textBlack }]}>
            {insight.title}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Open ${insight.category.toLowerCase()} details`}
          accessibilityHint="Navigates to the related tracking screen"
          hitSlop={8}
          onPress={onPress}
          style={styles.openButton}
        >
          <MaterialCommunityIcons
            name="arrow-top-right"
            size={19}
            color={theme.primary}
          />
        </TouchableOpacity>
      </View>

      <Text selectable style={[styles.message, { color: theme.text }]}>
        {insight.message}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${explanationVisible ? "Hide" : "Show"} insight explanation`}
        accessibilityState={{ expanded: explanationVisible }}
        hitSlop={8}
        onPress={() => setExplanationVisible((visible) => !visible)}
        style={styles.explanationButton}
      >
        <Text style={[styles.explanationLabel, { color: theme.primary }]}>
          {explanationVisible ? "Hide explanation" : "Why am I seeing this?"}
        </Text>
        <MaterialCommunityIcons
          name={explanationVisible ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.primary}
        />
      </TouchableOpacity>

      {explanationVisible ? (
        <Text
          selectable
          accessibilityLiveRegion="polite"
          style={[
            styles.reason,
            {
              color: theme.textLight,
              borderTopColor: theme.border,
            },
          ]}
        >
          {insight.reason}
        </Text>
      ) : null}
    </ShadowGlowCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  icon: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: FONT_FAMILIES.extraBold,
    fontSize: 14,
  },
  openButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  message: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  explanationButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 3,
    minHeight: 44,
  },
  explanationLabel: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 11,
  },
  reason: {
    borderTopWidth: StyleSheet.hairlineWidth,
    fontFamily: FONT_FAMILIES.medium,
    fontSize: 11,
    lineHeight: 17,
    paddingTop: 10,
  },
});
