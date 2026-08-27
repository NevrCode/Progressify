import { IconButton } from "@/components/base/icon-button";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { StatePanel } from "@/components/base/state-panel";
import { ProgressionChartFrame } from "@/components/gym/progression-chart-frame";
import type { GymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import type {
  ExerciseProgressionDTO,
  WorkoutSetDTO,
} from "@/services/gymService";
import type { ProgressionChartSummary } from "@/utils/progression-chart-summary";
import type { SessionProgressionPoint } from "@/features/gym/exercise-progression";
import {
  getDayMonth,
  getDayMonthYear,
} from "@/features/gym/exercise-progression";
import {
  displayMass,
  formatMass,
  massUnitLabel,
  type MeasurementSystem,
} from "@/utils/measurement-units";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

type ExerciseProgressionCardProps = {
  exercise: ExerciseProgressionDTO;
  expanded: boolean;
  deleting: boolean;
  latestSession: { session_date?: string } | undefined;
  latestSessionSets: WorkoutSetDTO[];
  sessionProgression: SessionProgressionPoint[];
  trend: { value: string; isPositive: boolean } | null;
  chartSummary: ProgressionChartSummary;
  measurementSystem: MeasurementSystem;
  theme: ThemeType;
  styles: GymStyles;
  onToggleExpand: (exerciseId: number) => void;
  onEdit: (exercise: ExerciseProgressionDTO) => void;
  onDelete: (exercise: ExerciseProgressionDTO) => void;
  onManageSessions: (exercise: ExerciseProgressionDTO) => void;
};

/**
 * A single exercise progression card: header, trend/muscle tags, and (when
 * expanded) the 1RM chart and latest-session set table.
 *
 * Memoized so that unrelated screen state (search text, date picker,
 * pagination) does not re-render every card and its chart. That only holds
 * while every prop keeps a stable identity across renders — the parent must
 * memoize `styles` and the callback props.
 */
function ExerciseProgressionCardComponent({
  exercise,
  expanded,
  deleting,
  latestSession,
  latestSessionSets,
  sessionProgression,
  trend,
  chartSummary,
  measurementSystem,
  theme,
  styles,
  onToggleExpand,
  onEdit,
  onDelete,
  onManageSessions,
}: ExerciseProgressionCardProps) {
  const chartData = useMemo(
    () =>
      sessionProgression.map((point) => ({
        value: displayMass(point.estimated1RM, measurementSystem),
        label: getDayMonth(point.sessionDate),
        dataPointText: `${displayMass(point.estimated1RM, measurementSystem)}`,
      })),
    [sessionProgression, measurementSystem],
  );

  const maxChartValue = useMemo(
    () =>
      Math.max(
        ...sessionProgression.map((p) =>
          displayMass(p.estimated1RM, measurementSystem),
        ),
      ) + 5,
    [sessionProgression, measurementSystem],
  );

  const hasSessionHistory = sessionProgression.length > 0;

  return (
    <ShadowGlowCard style={styles.exerciseCardOutline}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${exercise.name ?? "exercise"} progression`}
        accessibilityState={{ expanded }}
        style={styles.exerciseCardToggle}
        activeOpacity={0.7}
        onPress={() => onToggleExpand(exercise.id)}
      >
        <View style={styles.exerciseHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.exerciseTitleRow}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
            </View>

            <View style={styles.exerciseTagsRow}>
              {exercise.muscle_group && (
                <View style={styles.muscleTag}>
                  <Text style={styles.muscleTagText}>
                    {exercise.muscle_group}
                  </Text>
                </View>
              )}
              {trend && (
                <View
                  style={
                    trend.isPositive
                      ? styles.trendTagPositive
                      : styles.trendTagNegative
                  }
                >
                  <Text
                    style={
                      trend.isPositive
                        ? styles.trendTagTextPositive
                        : styles.trendTagTextNegative
                    }
                  >
                    {trend.isPositive ? "▲" : "▼"} {trend.value}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.exerciseSubMeta, { marginTop: 6 }]}>
              Last session:{" "}
              {latestSession
                ? getDayMonthYear(latestSession.session_date)
                : "-"}
            </Text>
          </View>
          <View style={styles.cardActionIcons}>
            <View style={styles.cardActionIconsCompact}>
              <IconButton
                accessibilityLabel={`Edit ${exercise.name ?? ""}`}
                onPress={() => onEdit(exercise)}
                icon={
                  <MaterialIcons
                    name="edit-document"
                    size={14}
                    color={theme.primary}
                  />
                }
              />
              <IconButton
                accessibilityLabel={`Delete ${exercise.name ?? ""}`}
                variant="destructive"
                loading={deleting}
                onPress={() => onDelete(exercise)}
                icon={
                  <MaterialIcons
                    name="delete-outline"
                    size={14}
                    color={theme.expense}
                  />
                }
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={styles.subsectionHeader}>
            <View>
              <Text style={[styles.subsectionTitle, { marginBottom: 8 }]}>
                Session progression ({massUnitLabel(measurementSystem)})
              </Text>
            </View>
          </View>

          {hasSessionHistory ? (
            <ProgressionChartFrame
              summary={chartSummary}
              style={[styles.chartBlock, styles.chartShadow]}
            >
              <LineChart
                areaChart
                curved
                isAnimated
                data={chartData}
                scrollToEnd
                scrollAnimation={false}
                height={220}
                spacing={56}
                initialSpacing={18}
                endSpacing={18}
                thickness={4}
                color={theme.primary}
                startFillColor={theme.primary}
                endFillColor={theme.primary}
                startOpacity={0.25}
                endOpacity={0.02}
                hideRules={false}
                rulesColor={`${theme.background}`}
                rulesType="dashed"
                yAxisColor={theme.background}
                xAxisColor={theme.background}
                hideYAxisText={false}
                yAxisTextStyle={styles.chartAxisLabel}
                backgroundColor={theme.background}
                xAxisLabelTextStyle={styles.chartXAxisLabel}
                noOfSections={4}
                maxValue={maxChartValue}
                dataPointsColor={theme.primary}
                dataPointsRadius={6}
                textColor={theme.text}
                textFontSize={11}
                textShiftY={-14}
                textShiftX={-10}
                focusedDataPointColor={theme.white}
                focusedDataPointRadius={8}
                showVerticalLines
                verticalLinesColor={`${theme.border}33`}
                pointerConfig={{
                  pointerStripHeight: 160,
                  pointerStripColor: `${theme.primary}66`,
                  pointerStripWidth: 2,
                  pointerColor: theme.primary,
                  radius: 7,
                  activatePointersOnLongPress: true,
                  autoAdjustPointerLabelPosition: true,
                  // gifted-charts hands the pointer every series item under
                  // the cursor; this chart has one series, so only the first
                  // is read.
                  pointerLabelComponent: (items: { value?: number }[]) => {
                    const item = items[0];
                    if (!item) return null;
                    return (
                      <View style={styles.pointerTooltip}>
                        <Text style={styles.pointerTooltipText}>
                          {item.value}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
            </ProgressionChartFrame>
          ) : (
            <StatePanel
              variant="empty"
              compact
              embedded
              title="No progression history"
              message="Record exercise sessions with sets to build this graph over time."
              primaryAction={{
                label: "Manage sessions",
                onPress: () => onManageSessions(exercise),
              }}
            />
          )}

          <View
            style={[
              styles.subsectionHeader,
              { marginTop: 16, marginBottom: 8 },
            ]}
          >
            <Text style={styles.subsectionTitle}>Latest workout session</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Manage workout sessions for ${exercise.name ?? "exercise"}`}
              style={styles.inlineAction}
              onPress={() => onManageSessions(exercise)}
            >
              <MaterialIcons name="edit" size={16} color={theme.primary} />
              <Text style={styles.inlineActionText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {latestSessionSets.length ? (
            <View style={[styles.setTable, { marginBottom: 12 }]}>
              <View style={styles.setTableHeader}>
                <Text style={styles.setHeaderText}>Set</Text>
                <Text style={styles.setHeaderText}>
                  Weight ({massUnitLabel(measurementSystem)})
                </Text>
                <Text style={styles.setHeaderText}>Reps</Text>
                <Text style={styles.setHeaderText}>RIR</Text>
              </View>
              {latestSessionSets.map((set) => (
                <View key={set.id} style={styles.setRow}>
                  <Text
                    style={[
                      styles.setValue,
                      set.set_type === "WARMUP" && styles.warmupSetValue,
                    ]}
                  >
                    {set.set_type === "WARMUP"
                      ? `W${set.set_number}`
                      : `#${set.set_number}`}
                  </Text>
                  <Text style={styles.setValue}>
                    {formatMass(set.weight, measurementSystem)}
                  </Text>
                  <Text style={styles.setValue}>{set.reps}</Text>
                  <Text style={styles.setValue}>{set.rir ?? 0}</Text>
                </View>
              ))}
            </View>
          ) : (
            <StatePanel
              variant="empty"
              compact
              embedded
              title="No sets in the latest session"
              message="Add sets to record weight, repetitions, and RIR for this workout."
              primaryAction={{
                label: "Manage sets",
                onPress: () => onManageSessions(exercise),
              }}
            />
          )}

          <View style={styles.saveAndNoteRow}>
            {!!exercise.notes && (
              <View style={styles.noteRow}>
                <MaterialCommunityIcons
                  name="notebook-outline"
                  size={18}
                  color={theme.primary}
                />
                <Text style={styles.noteText}>{exercise.notes}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ShadowGlowCard>
  );
}

export const ExerciseProgressionCard = memo(ExerciseProgressionCardComponent);
