import { AppButton } from "@/components/base/app-button";
import { PlannedExerciseRow } from "@/components/gym/planned-exercise-row";
import type { ProgramsStyles } from "@/assets/styles/programs.style";
import { ThemeType } from "@/constants/colors";
import type {
  PlannedExerciseDTO,
  WorkoutRoutineDTO,
} from "@/services/workoutProgramService";
import { Text, View } from "react-native";

type RoutineManageCardProps = {
  routine: WorkoutRoutineDTO;
  starting: boolean;
  duplicating: boolean;
  restSecondsDrafts: Record<number, string>;
  savingRestForPlannedId: number | null;
  styles: ProgramsStyles;
  theme: ThemeType;
  onStart: (routineId: number) => void;
  onDuplicate: (routine: WorkoutRoutineDTO) => void;
  onDelete: (routine: WorkoutRoutineDTO) => void;
  onAddExercise: (routine: WorkoutRoutineDTO) => void;
  onDeleteExercise: (plannedId: number) => void;
  onChangeRestDraft: (plannedId: number, value: string) => void;
  onSaveRest: (planned: PlannedExerciseDTO) => void;
};

/**
 * Full management card for one routine: header, start/duplicate/delete
 * actions, and every planned exercise.
 *
 * Deliberately not memoized — it re-renders whenever screen state changes,
 * same as before this refactor. That's fine: its own JSX is cheap. The
 * expensive part, each `PlannedExerciseRow`, is memoized on its own draft
 * value, so a rest-time keystroke here only re-renders the row it targets.
 */
export function RoutineManageCard({
  routine,
  starting,
  duplicating,
  restSecondsDrafts,
  savingRestForPlannedId,
  styles,
  theme,
  onStart,
  onDuplicate,
  onDelete,
  onAddExercise,
  onDeleteExercise,
  onChangeRestDraft,
  onSaveRest,
}: RoutineManageCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.rowSpaceBetween}>
        <View style={styles.flexOneGap3}>
          <Text selectable style={styles.titleMD}>
            {routine.name}
          </Text>
          <Text selectable style={styles.metaTextSmall}>
            {routine.planned_exercises.length} exercises
          </Text>
        </View>
        <AppButton
          label="Start"
          disabled={!routine.planned_exercises.length}
          loading={starting}
          onPress={() => onStart(routine.id)}
        />
      </View>

      <AppButton
        label="Duplicate routine"
        variant="secondary"
        loading={duplicating}
        onPress={() => onDuplicate(routine)}
      />
      <AppButton
        disabled={routine.planned_exercises.length > 0}
        label={
          routine.planned_exercises.length > 0
            ? "Remove exercises to delete routine"
            : "Delete routine"
        }
        variant="ghost"
        onPress={() => onDelete(routine)}
      />

      {routine.planned_exercises.map((planned) => (
        <PlannedExerciseRow
          key={planned.id}
          planned={planned}
          draftValue={
            restSecondsDrafts[planned.id] ??
            String(planned.rest_seconds ?? 90)
          }
          saving={savingRestForPlannedId === planned.id}
          styles={styles}
          theme={theme}
          onDeleteExercise={onDeleteExercise}
          onChangeDraft={onChangeRestDraft}
          onSaveRest={onSaveRest}
        />
      ))}
      <AppButton
        label="Add exercise"
        variant="secondary"
        onPress={() => onAddExercise(routine)}
      />
    </View>
  );
}
