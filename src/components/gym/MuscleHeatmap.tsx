import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ThemeType } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { catalogExercises } from "@/data/exercise-catalog";
import { ExerciseProgressionDTO } from "@/services/gymService";
import {
  calculateWeeklyMuscleVolume,
  getMuscleIntensity,
  getMuscleIntensityLabel,
  MUSCLE_INTENSITY_COLORS,
  type MuscleContribution,
} from "@/utils/muscle-heatmap";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Body, { ExtendedBodyPart, Slug } from "react-native-body-highlighter";

interface MuscleHeatmapProps {
  exercises: ExerciseProgressionDTO[];
}

export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({ exercises }) => {
  const { theme } = useTheme();
  const styles = style(theme);
  const [selectedMuscle, setSelectedMuscle] = useState<{
    name: string;
    setEquivalents: number;
    contributions: MuscleContribution[];
  } | null>(null);

  const catalogById = useMemo(
    () => new Map(catalogExercises.map((exercise) => [exercise.id, exercise])),
    [],
  );
  const weeklyVolume = useMemo(
    () => calculateWeeklyMuscleVolume({ exercises, catalogById }),
    [catalogById, exercises],
  );

  const highlightedData = useMemo(() => {
    return Object.entries(weeklyVolume.bodyRegionTotals).flatMap(
      ([slug, setEquivalents]) => {
        const intensity = getMuscleIntensity(setEquivalents);
        return intensity > 0 ? [{ slug: slug as Slug, intensity }] : [];
      },
    );
  }, [weeklyVolume.bodyRegionTotals]);
  const formatSetEquivalents = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

  const formatBodyPartName = (slug: Slug) => {
    const names: Partial<Record<Slug, string>> = {
      abs: "Abdominals",
      adductors: "Adductors",
      deltoids: "Shoulders",
      forearm: "Forearms",
      gluteal: "Glutes",
      hamstring: "Hamstrings",
      "lower-back": "Lower back",
      obliques: "Abdominals",
      quadriceps: "Quadriceps",
      trapezius: "Traps",
      "upper-back": "Upper back",
    };
    return (
      names[slug] ??
      slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };
  const accessibleSummary = Object.entries(weeklyVolume.bodyRegionTotals)
    .filter(([, setEquivalents]) => setEquivalents > 0)
    .map(
      ([slug, setEquivalents]) =>
        `${formatBodyPartName(slug as Slug)}, ${formatSetEquivalents(setEquivalents)} set equivalents, ${getMuscleIntensityLabel(getMuscleIntensity(setEquivalents))}`,
    );
  const accessibleSummaryLabel = accessibleSummary.length
    ? `Weekly muscle volume. ${accessibleSummary.join(". ")}.`
    : "Weekly muscle volume. No muscle volume recorded in the last seven days.";

  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;
    setSelectedMuscle({
      name: formatBodyPartName(part.slug),
      setEquivalents: weeklyVolume.bodyRegionTotals[part.slug] ?? 0,
      contributions: weeklyVolume.bodyRegionContributions[part.slug] ?? [],
    });
  };

  const selectedIntensity = getMuscleIntensity(
    selectedMuscle?.setEquivalents ?? 0,
  );
  const selectedColor =
    selectedIntensity === 0
      ? theme.textLight
      : MUSCLE_INTENSITY_COLORS[selectedIntensity - 1];

  return (
    <ShadowGlowCard
      style={[
        styles.container,
        {
          borderColor: theme.primary + "30",
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Volume Heatmap</Text>
        <Text style={styles.subtitle}>
          Primary and secondary set equivalents over the last 7 days
        </Text>
        <View style={styles.legend}>
          {[
            { label: "Low", color: MUSCLE_INTENSITY_COLORS[0] },
            { label: "Moderate", color: MUSCLE_INTENSITY_COLORS[1] },
            { label: "Target", color: MUSCLE_INTENSITY_COLORS[2] },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: item.color }]}
              />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibleSummaryLabel}
        style={styles.avatarRow}
      >
        {/* FRONT VIEW */}
        <View style={styles.avatarColumn}>
          <Text style={styles.viewLabel}>Front</Text>
          <View style={styles.bodyContainer}>
            <Body
              data={highlightedData}
              colors={MUSCLE_INTENSITY_COLORS}
              side="front"
              gender="male"
              scale={0.9}
              border={theme.border}
              defaultFill={theme.primary + "15"}
              defaultStroke={theme.background + "15"}
              defaultStrokeWidth={1}
              onBodyPartPress={handleBodyPartPress}
            />
          </View>
        </View>

        {/* BACK VIEW */}
        <View style={styles.avatarColumn}>
          <Text style={styles.viewLabel}>Back</Text>
          <View style={styles.bodyContainer}>
            <Body
              data={highlightedData}
              colors={MUSCLE_INTENSITY_COLORS}
              side="back"
              gender="male"
              scale={0.9}
              border={theme.border}
              defaultFill={theme.border + "15"}
              defaultStroke={theme.border}
              defaultStrokeWidth={1}
              onBodyPartPress={handleBodyPartPress}
            />
          </View>
        </View>
      </View>

      {/* Dynamic Detail Tooltip Panel */}
      {selectedMuscle ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.tooltipCard,
            { borderColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { color: theme.text }]}>
              {selectedMuscle.name}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close muscle details"
              hitSlop={10}
              onPress={() => setSelectedMuscle(null)}
            >
              <Text style={{ color: theme.textLight, fontSize: 11 }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tooltipContent}>
            <Text style={[styles.tooltipValue, { color: theme.primary }]}>
              {formatSetEquivalents(selectedMuscle.setEquivalents)}{" "}
              <Text style={{ color: theme.textLight, fontSize: 13 }}>
                set equivalents
              </Text>
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: selectedColor + "1A",
                },
              ]}
            >
              <Text style={[styles.statusText, { color: selectedColor }]}>
                {getMuscleIntensityLabel(selectedIntensity)}
              </Text>
            </View>
          </View>
          {selectedMuscle.contributions.length > 0 ? (
            <Text style={styles.contributionText}>
              {selectedMuscle.contributions
                .map(
                  ({ muscle, setEquivalents }) =>
                    `${muscle}: ${formatSetEquivalents(setEquivalents)}`,
                )
                .join(" · ")}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyTooltip}>
          <Text style={{ color: theme.textLight, fontSize: 11 }}>
            Tap a muscle group to see its catalog-based weekly exposure.
          </Text>
        </View>
      )}
      {weeklyVolume.unmappedExerciseCount > 0 ? (
        <Text style={styles.unmappedText}>
          {weeklyVolume.unmappedExerciseCount} custom or legacy{" "}
          {weeklyVolume.unmappedExerciseCount === 1
            ? "exercise needs"
            : "exercises need"}{" "}
          a canonical muscle assignment.
        </Text>
      ) : null}
    </ShadowGlowCard>
  );
};

const style = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      width: "100%",
      padding: 16,
      marginBottom: 12,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },
    subtitle: {
      color: theme.text,
      fontSize: 11,
      opacity: 0.6,
      marginTop: 2,
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 10,
    },
    legendItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
    },
    legendDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    legendLabel: {
      color: theme.textLight,
      fontSize: 11,
      fontWeight: "600",
    },
    avatarRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      marginVertical: 8,
    },
    avatarColumn: {
      alignItems: "center",
      gap: 8,
    },
    viewLabel: {
      fontSize: 11,
      color: theme.text,
      fontWeight: "600",
      opacity: 0.8,
      textTransform: "uppercase",
    },
    bodyContainer: {
      width: 140,
      height: 240,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    tooltipCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginTop: 14,
      gap: 8,
    },
    tooltipHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    tooltipTitle: {
      fontSize: 13,
      color: theme.text,
      fontWeight: "700",
    },
    tooltipContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    tooltipValue: {
      fontSize: 18,
      fontWeight: "800",
    },
    statusBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "700",
    },
    contributionText: {
      color: theme.textLight,
      fontSize: 11,
      lineHeight: 16,
      textTransform: "capitalize",
    },
    emptyTooltip: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      opacity: 0.8,
    },
    unmappedText: {
      color: theme.textLight,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 8,
      opacity: 0.8,
    },
  });
