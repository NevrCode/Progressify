import type { GymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import type { EditableSet } from "@/features/gym/session-editor";
import {
  formatMassInput,
  massUnitLabel,
  parseMassInput,
  type MeasurementSystem,
} from "@/utils/measurement-units";
import { MaterialIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type EditableSetRowProps = {
  set: EditableSet;
  index: number;
  isLast: boolean;
  measurementSystem: MeasurementSystem;
  styles: GymStyles;
  theme: ThemeType;
  onToggleType: (localId: string) => void;
  onChangeField: (
    localId: string,
    field: keyof Omit<EditableSet, "localId" | "id">,
    value: string,
  ) => void;
  onRemove: (localId: string) => void;
};

/**
 * One row in the session-edit modal's set table: warm-up toggle, weight,
 * reps, RIR inputs, and a delete action.
 *
 * Memoized so typing in one set's weight/reps/RIR field does not re-render
 * every other set row in the table.
 */
function EditableSetRowComponent({
  set,
  index,
  isLast,
  measurementSystem,
  styles,
  theme,
  onToggleType,
  onChangeField,
  onRemove,
}: EditableSetRowProps) {
  const isWarmup = set.set_type === "WARMUP";

  return (
    <View
      style={[
        styles.setRowBase,
        isLast ? styles.setRowNoBorder : styles.setRowBorder,
        isWarmup && styles.setRowWarmupBackground,
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Set ${index + 1} is ${isWarmup ? "a warm-up set" : "a working set"}. Change to ${isWarmup ? "working" : "warm-up"} set`}
        accessibilityState={{ selected: isWarmup }}
        onPress={() => onToggleType(set.localId)}
        style={styles.setNumberToggle}
      >
        <Text
          style={[
            styles.setNumberText,
            isWarmup ? styles.setNumberTextWarmup : styles.setNumberTextWorking,
          ]}
        >
          {isWarmup ? `W${index + 1}` : index + 1}
        </Text>
        <Text style={styles.setTypeCaption}>
          {isWarmup ? "WARM-UP" : "WORK"}
        </Text>
      </TouchableOpacity>

      <View style={styles.setCellWeight}>
        <TextInput
          accessibilityLabel={`Set ${index + 1} weight in ${massUnitLabel(measurementSystem)}`}
          style={styles.setCellInput}
          keyboardType="decimal-pad"
          placeholder={massUnitLabel(measurementSystem)}
          placeholderTextColor={theme.textLight}
          value={formatMassInput(
            set.weight ? Number(set.weight) : undefined,
            measurementSystem,
          )}
          onChangeText={(value) => {
            const canonicalWeight = parseMassInput(value, measurementSystem);
            onChangeField(
              set.localId,
              "weight",
              canonicalWeight == null ? "" : String(canonicalWeight),
            );
          }}
        />
      </View>

      <View style={styles.setCellReps}>
        <TextInput
          accessibilityLabel={`Set ${index + 1} repetitions`}
          style={styles.setCellInput}
          keyboardType="number-pad"
          placeholder="reps"
          placeholderTextColor={theme.textLight}
          value={set.reps}
          onChangeText={(value) => onChangeField(set.localId, "reps", value)}
        />
      </View>

      <View style={styles.setCellRir}>
        <TextInput
          accessibilityLabel={`Set ${index + 1} repetitions in reserve`}
          style={styles.setCellInput}
          keyboardType="number-pad"
          placeholder="RIR"
          placeholderTextColor={theme.textLight}
          value={set.rir}
          onChangeText={(value) => onChangeField(set.localId, "rir", value)}
        />
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Delete set ${index + 1}`}
        hitSlop={9}
        onPress={() => onRemove(set.localId)}
        style={styles.setDeleteCell}
      >
        <MaterialIcons
          name="remove-circle-outline"
          size={18}
          color={theme.expense}
        />
      </TouchableOpacity>
    </View>
  );
}

export const EditableSetRow = memo(EditableSetRowComponent);
