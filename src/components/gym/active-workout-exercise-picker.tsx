import { gymStyles } from "@/assets/styles/gym.style";
import { ModalHeader } from "@/components/base/modal-header";
import type { ThemeType } from "@/constants/colors";
import type { ExerciseProgressionDTO } from "@/services/gymService";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  mode: "add" | "swap";
  exercises: ExerciseProgressionDTO[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (exerciseId: number) => void;
  onClose: () => void;
  theme: ThemeType;
};

const nameOf = (exercise: ExerciseProgressionDTO) => exercise.name ?? "Exercise";

export function ActiveWorkoutExercisePicker({
  visible,
  mode,
  exercises,
  search,
  onSearchChange,
  onSelect,
  onClose,
  theme,
}: Props) {
  const styles = gymStyles(theme);
  const isSwap = mode === "swap";
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={[styles.modalCard, { maxHeight: "70%" }]}>
          <ModalHeader
            closeLabel={`Close ${isSwap ? "swap" : "add"} exercise`}
            onClose={onClose}
            style={styles.modalHeader}
            title={isSwap ? "Swap Exercise" : "Add Exercise"}
          />
          <TextInput
            accessibilityLabel="Search available exercises"
            style={styles.input}
            placeholder="Search exercises..."
            placeholderTextColor={theme.textLight}
            value={search}
            onChangeText={onSearchChange}
          />
          <ScrollView contentContainerStyle={{ gap: 8 }}>
            {exercises.length === 0 ? (
              <Text style={styles.emptyText}>
                {isSwap ? "No other exercises available." : "No more exercises available."}
              </Text>
            ) : exercises.map((exercise) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${isSwap ? "Swap to" : "Add"} ${nameOf(exercise)}${isSwap ? "" : " to workout"}`}
                key={exercise.id}
                style={styles.listCard}
                onPress={() => onSelect(exercise.id)}
              >
                <Text style={styles.listTitle}>{nameOf(exercise)}</Text>
                <Text style={styles.listMeta}>
                  {exercise.muscle_group ?? "-"} | {exercise.target_rep_range ?? "-"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
