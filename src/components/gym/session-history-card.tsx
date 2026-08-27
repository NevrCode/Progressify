import type { GymStyles } from "@/assets/styles/gym.style";
import { ThemeType } from "@/constants/colors";
import type { ExerciseSessionDTO } from "@/services/gymService";
import {
  formatDateForDisplay,
  getSessionDate,
  getSessionSets,
} from "@/features/gym/session-editor";
import { isWorkingSet } from "@/types/workout-set";
import {
  displayMass,
  formatMass,
  massUnitLabel,
  type MeasurementSystem,
} from "@/utils/measurement-units";
import { calculateWorkingSetVolume } from "@/utils/workoutMetrics";
import { MaterialIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type SessionHistoryCardProps = {
  session: ExerciseSessionDTO;
  measurementSystem: MeasurementSystem;
  styles: GymStyles;
  theme: ThemeType;
  onEdit: (session: ExerciseSessionDTO) => void;
  onDelete: (session: ExerciseSessionDTO) => void;
};

/**
 * A read-only summary of one recorded session: date, volume, notes, and its
 * full set table, with edit/delete actions.
 *
 * Memoized so that typing inside the edit-session modal (a sibling, not a
 * child, of this list) does not re-render every session card underneath it.
 */
function SessionHistoryCardComponent({
  session,
  measurementSystem,
  styles,
  theme,
  onEdit,
  onDelete,
}: SessionHistoryCardProps) {
  const sessionDateValue = getSessionDate(session);
  const sets = getSessionSets(session);
  const totalVolume = calculateWorkingSetVolume(sets);

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.flexOne}>
          <Text style={styles.exerciseName}>
            {formatDateForDisplay(sessionDateValue)}
          </Text>
          <Text style={styles.exerciseMeta}>
            {sets.filter(isWorkingSet).length} working / {sets.length} total
            sets | {displayMass(totalVolume, measurementSystem, 0)}{" "}
            {massUnitLabel(measurementSystem)}-reps working volume
          </Text>
          {!!session.notes && (
            <Text style={styles.exerciseSubMeta}>{session.notes}</Text>
          )}
        </View>
        <View style={styles.cardActionIcons}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Edit session from ${session.session_date}`}
            hitSlop={9}
            onPress={() => onEdit(session)}
          >
            <MaterialIcons name="edit" size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Delete session from ${session.session_date}`}
            hitSlop={9}
            onPress={() => onDelete(session)}
          >
            <MaterialIcons
              name="delete-outline"
              size={18}
              color={theme.expense}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.setTable}>
        <View style={styles.setTableHeader}>
          <Text style={styles.setHeaderText}>Set</Text>
          <Text style={styles.setHeaderText}>
            Weight ({massUnitLabel(measurementSystem)})
          </Text>
          <Text style={styles.setHeaderText}>Reps</Text>
          <Text style={styles.setHeaderText}>RIR</Text>
        </View>
        {sets.map((set, index) => (
          <View key={set.id ?? index} style={styles.setRow}>
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
    </View>
  );
}

export const SessionHistoryCard = memo(SessionHistoryCardComponent);
