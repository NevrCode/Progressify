import { AppButton } from "@/components/base/app-button";
import type { ProgramsStyles } from "@/assets/styles/programs.style";
import type { WorkoutRoutineDTO } from "@/services/workoutProgramService";
import { memo } from "react";
import { Text, View } from "react-native";

type RoutineLauncherCardProps = {
  routine: WorkoutRoutineDTO;
  starting: boolean;
  styles: ProgramsStyles;
  onStart: (routineId: number) => void;
};

/**
 * A routine card in the horizontal "choose today's workout" launcher.
 *
 * Memoized so that unrelated screen state (form drafts, other routines
 * starting) does not re-render every launcher card.
 */
function RoutineLauncherCardComponent({
  routine,
  starting,
  styles,
  onStart,
}: RoutineLauncherCardProps) {
  return (
    <View style={[styles.card, styles.launcherCard]}>
      <View style={styles.sectionGap5}>
        <Text selectable style={styles.titleSM}>
          {routine.name}
        </Text>
        <Text selectable style={styles.metaTextSmall}>
          {routine.planned_exercises.length} exercises
        </Text>
        <Text numberOfLines={2} style={styles.launcherPreview}>
          {routine.planned_exercises.length > 0
            ? routine.planned_exercises
                .slice(0, 3)
                .map((exercise) => exercise.exercise_name)
                .join(" · ")
            : "Add exercises before starting this routine."}
        </Text>
      </View>
      <AppButton
        label="Start workout"
        disabled={!routine.planned_exercises.length}
        loading={starting}
        onPress={() => onStart(routine.id)}
      />
    </View>
  );
}

export const RoutineLauncherCard = memo(RoutineLauncherCardComponent);
