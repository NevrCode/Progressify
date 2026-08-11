import { gymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import { ExerciseProgressionDTO } from "@/services/gymService";
import { MaterialIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type GymStyles = ReturnType<typeof gymStyles>;

const getExerciseName = (exercise: ExerciseProgressionDTO) =>
  exercise.name ?? "Exercise";

type ExerciseSelectRowProps = {
  exercise: ExerciseProgressionDTO;
  selected: boolean;
  onToggle: (exerciseId: number) => void;
  styles: GymStyles;
  theme: ThemeType;
};

/**
 * A single selectable exercise in the session setup list.
 *
 * Memoized so that toggling one row does not re-render the rest of the list.
 * That only holds while every prop keeps a stable identity across renders, so
 * the parent must memoize `styles` and `onToggle`.
 */
function ExerciseSelectRowComponent({
  exercise,
  selected,
  onToggle,
  styles,
  theme,
}: ExerciseSelectRowProps) {
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityLabel={getExerciseName(exercise)}
      accessibilityState={{ checked: selected }}
      style={[
        styles.exerciseCard,
        selected && {
          borderWidth: 2,
          borderColor: theme.primary,
        },
      ]}
      activeOpacity={0.7}
      onPress={() => onToggle(exercise.id)}
    >
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{getExerciseName(exercise)}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.muscle_group ?? "-"} | {exercise.target_rep_range ?? "-"}
          </Text>
          {!!exercise.last_session_date && (
            <Text style={styles.exerciseSubMeta}>
              Last: {exercise.last_session_date}
            </Text>
          )}
        </View>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected ? theme.primary : "transparent",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {selected && (
            <MaterialIcons name="check" size={18} color={theme.white} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ExerciseSelectRow = memo(ExerciseSelectRowComponent);
