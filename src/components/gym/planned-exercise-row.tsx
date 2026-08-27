import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { SwipeToDeleteExerciseRow } from "@/components/gym/swipe-to-delete-exercise-row";
import type { ProgramsStyles } from "@/assets/styles/programs.style";
import { ThemeType } from "@/constants/colors";
import type { PlannedExerciseDTO } from "@/services/workoutProgramService";
import { memo } from "react";
import { View } from "react-native";

type PlannedExerciseRowProps = {
  planned: PlannedExerciseDTO;
  draftValue: string;
  saving: boolean;
  styles: ProgramsStyles;
  theme: ThemeType;
  onDeleteExercise: (plannedId: number) => void;
  onChangeDraft: (plannedId: number, value: string) => void;
  onSaveRest: (planned: PlannedExerciseDTO) => void;
};

/**
 * One planned exercise inside a routine's management card: swipe-to-delete
 * row, rest-time field, and save button.
 *
 * Memoized on its own draft value so typing a rest-time for one exercise does
 * not re-render every other exercise row across every routine on the screen.
 * That only holds while `onDeleteExercise` / `onChangeDraft` / `onSaveRest`
 * keep stable identities — the parent must `useCallback` them.
 */
function PlannedExerciseRowComponent({
  planned,
  draftValue,
  saving,
  styles,
  theme,
  onDeleteExercise,
  onChangeDraft,
  onSaveRest,
}: PlannedExerciseRowProps) {
  return (
    <View style={styles.plannedExerciseWrap}>
      <SwipeToDeleteExerciseRow
        exerciseName={planned.exercise_name}
        onDelete={() => onDeleteExercise(planned.id)}
        theme={theme}
        styles={styles}
      />
      <FormField
        accessibilityLabel={`Rest time for ${planned.exercise_name}`}
        helperText="0–3600 seconds. Used by the rest timer after each set."
        keyboardType="number-pad"
        label="Rest between sets (seconds)"
        onChangeText={(value) => onChangeDraft(planned.id, value)}
        value={draftValue}
      />
      <AppButton
        label="Save rest time"
        variant="secondary"
        loading={saving}
        onPress={() => onSaveRest(planned)}
      />
    </View>
  );
}

export const PlannedExerciseRow = memo(PlannedExerciseRowComponent);
