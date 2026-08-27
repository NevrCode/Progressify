import type { ProgramsStyles } from "@/assets/styles/programs.style";
import type { ExerciseProgressionDTO } from "@/services/gymService";
import { memo } from "react";
import { Text, TouchableOpacity } from "react-native";

type AvailableExerciseRowProps = {
  exercise: ExerciseProgressionDTO;
  styles: ProgramsStyles;
  onAdd: (exerciseId: number) => void;
};

/**
 * One exercise in the "add to routine" picker sheet.
 *
 * Memoized so opening the sheet for a large exercise list doesn't re-render
 * every row when the sheet's own action feedback changes.
 */
function AvailableExerciseRowComponent({
  exercise,
  styles,
  onAdd,
}: AvailableExerciseRowProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Add ${exercise.name}`}
      onPress={() => onAdd(exercise.id)}
      style={styles.exerciseRowSheet}
    >
      <Text selectable style={styles.plainTitle}>
        {exercise.name}
      </Text>
      <Text selectable style={styles.metaTextSmall}>
        {exercise.muscle_group ?? "Exercise"} ·{" "}
        {exercise.target_rep_range ?? "8-12"} reps
      </Text>
    </TouchableOpacity>
  );
}

export const AvailableExerciseRow = memo(AvailableExerciseRowComponent);
