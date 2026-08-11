import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import { IconButton } from "@/components/base/icon-button";
import { ProgressionRecommendationCard } from "@/components/gym/progression-recommendation-card";
import type { ThemeType } from "@/constants/colors";
import type { MeasurementSystem } from "@/utils/measurement-units";
import { formatMass } from "@/utils/measurement-units";
import { MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import type { ExerciseProgressionDTO } from "@/services/gymService";
import type { DraftSet, ExerciseDraft } from "./drafts";
import { ActiveWorkoutSetRow } from "./active-workout-set-row";

export type ActiveWorkoutGroupInfo = {
  id: string;
  memberIndex: number;
  size: number;
};

export type ActiveWorkoutExerciseActions = {
  addSet: (exerciseId: number) => void;
  updateSet: (exerciseId: number, localId: string, field: keyof DraftSet, value: string) => void;
  toggleSetType: (exerciseId: number, localId: string) => void;
  completeSet: (exerciseId: number, localId: string) => void;
  duplicateSet: (exerciseId: number, localId: string) => void;
  removeSet: (exerciseId: number, localId: string) => void;
  swapExercise: (exerciseId: number) => void;
  removeExercise: (exerciseId: number) => void;
  applyRecommendation: (exercise: ExerciseProgressionDTO) => void;
  finishExercise: (exercise: ExerciseProgressionDTO) => void;
};

type Props = {
  exercises: ExerciseProgressionDTO[];
  drafts: Record<number, ExerciseDraft>;
  completedIds: ReadonlySet<number>;
  finishingId: number | null;
  groupsByExercise: ReadonlyMap<number, ActiveWorkoutGroupInfo>;
  measurementSystem: MeasurementSystem;
  theme: ThemeType;
  actions: ActiveWorkoutExerciseActions;
};

const exerciseName = (exercise: ExerciseProgressionDTO) => exercise.name ?? "Exercise";

const lastSessionHint = (
  exercise: ExerciseProgressionDTO,
  measurementSystem: MeasurementSystem,
): string | null => {
  const sessions = exercise.exercise_sessions ?? [];
  if (!sessions.length) return null;
  const latest = sessions.reduce((best, current) =>
    (current.session_date ?? "") > (best.session_date ?? "") ? current : best,
  );
  const sets = [...(latest.sets ?? [])].sort((a, b) => a.set_number - b.set_number);
  return sets.length
    ? sets.map((set) => `${formatMass(set.weight, measurementSystem)} × ${set.reps}`).join(", ")
    : null;
};

/**
 * The complete grouped exercise surface. Its action port keeps rendering
 * independent of persistence, timer, and screen-navigation policy.
 */
export function ActiveWorkoutExerciseList({
  exercises,
  drafts,
  completedIds,
  finishingId,
  groupsByExercise,
  measurementSystem,
  theme,
  actions,
}: Props) {
  const styles = gymStyles(theme);

  return exercises.map((exercise) => {
    const draft = drafts[exercise.id];
    const isCompleted = completedIds.has(exercise.id);
    const isFinishing = finishingId === exercise.id;
    const sets = draft?.sets ?? [];
    const group = groupsByExercise.get(exercise.id);
    const hint = lastSessionHint(exercise, measurementSystem);
    const name = exerciseName(exercise);

    return (
      <View key={exercise.id} style={{ gap: 8 }}>
        {group?.memberIndex === 0 ? (
          <View
            accessible
            accessibilityLabel={`Superset with ${group.size} exercises`}
            style={{
              backgroundColor: theme.primary + "14",
              borderColor: theme.primary + "50",
              borderCurve: "continuous",
              borderRadius: 12,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text selectable style={{ color: theme.primary, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 12 }}>
              Superset · {group.size} exercises
            </Text>
            <Text selectable style={{ color: theme.textLight, fontSize: 10 }}>
              Finish every working-set round to start the shared rest timer.
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.exerciseCard,
            isCompleted && { opacity: 0.6, borderWidth: 2, borderColor: theme.income },
          ]}
        >
          <View style={styles.exerciseHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.exerciseName}>{name}</Text>
                {isCompleted ? <MaterialIcons name="check-circle" size={18} color={theme.income} /> : null}
              </View>
              <Text style={styles.exerciseMeta}>
                {exercise.muscle_group ?? "-"} | {exercise.target_rep_range ?? "-"}
              </Text>
              {hint ? (
                <Text
                  style={{ color: theme.textLight, fontSize: 11, fontWeight: "600", marginTop: 4 }}
                  numberOfLines={1}
                >
                  Last session: {hint}
                </Text>
              ) : null}
            </View>
            {!isCompleted ? (
              <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
                <IconButton
                  accessibilityLabel={`Swap ${name}`}
                  icon={<MaterialIcons name="swap-horiz" size={18} color={theme.primary} />}
                  onPress={() => actions.swapExercise(exercise.id)}
                  size="compact"
                />
                <IconButton
                  accessibilityLabel={`Remove ${name} from workout`}
                  icon={<MaterialIcons name="delete-outline" size={18} color={theme.expense} />}
                  onPress={() => actions.removeExercise(exercise.id)}
                  size="compact"
                  variant="destructive"
                />
              </View>
            ) : null}
          </View>

          {!isCompleted ? (
            <ProgressionRecommendationCard
              exerciseName={name}
              recommendation={exercise.recommendation}
              disabled={isFinishing}
              onApply={() => actions.applyRecommendation(exercise)}
            />
          ) : null}

          {!isCompleted ? (
            <View style={styles.subsectionHeader}>
              <Text style={styles.subsectionTitle}>Sets</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Add set to ${name}`}
                accessibilityState={{ disabled: isFinishing }}
                style={styles.inlineAction}
                onPress={() => actions.addSet(exercise.id)}
                disabled={isFinishing}
              >
                <MaterialIcons name="add" size={16} color={isFinishing ? theme.textLight : theme.primary} />
                <Text style={[styles.inlineActionText, isFinishing && { color: theme.textLight }]}>Add set</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {sets.length > 0 ? (
            <View style={{
              borderWidth: 1.5,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.background,
              overflow: "hidden",
              marginTop: 10,
            }}>
              {sets.map((set, index) => (
                <ActiveWorkoutSetRow
                  key={set.localId}
                  set={set}
                  exerciseName={name}
                  theme={theme}
                  disabled={isCompleted || isFinishing}
                  isLast={index === sets.length - 1}
                  onChange={(field, value) => actions.updateSet(exercise.id, set.localId, field, value)}
                  onToggleType={() => actions.toggleSetType(exercise.id, set.localId)}
                  onComplete={() => actions.completeSet(exercise.id, set.localId)}
                  onDuplicate={() => actions.duplicateSet(exercise.id, set.localId)}
                  onRemove={() => actions.removeSet(exercise.id, set.localId)}
                />
              ))}
            </View>
          ) : null}

          {!isCompleted ? (
            <AppButton label="Finish Exercise" loading={isFinishing} onPress={() => actions.finishExercise(exercise)} />
          ) : null}
        </View>
      </View>
    );
  });
}
