import type { ProgramsStyles } from "@/assets/styles/programs.style";
import { ThemeType } from "@/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

type SwipeToDeleteExerciseRowProps = {
  exerciseName: string;
  onDelete: () => void;
  theme: ThemeType;
  styles: ProgramsStyles;
};

/**
 * A planned-exercise row that swipes left to reveal a delete action.
 *
 * Memoized so that editing one exercise's rest-time draft does not re-render
 * every other exercise's swipe row in the same or other routines.
 */
function SwipeToDeleteExerciseRowComponent({
  exerciseName,
  onDelete,
  theme,
  styles,
}: SwipeToDeleteExerciseRowProps) {
  const deleteAction = (methods: SwipeableMethods) => (
    <TouchableOpacity
      accessibilityLabel={`Delete ${exerciseName}`}
      accessibilityRole="button"
      activeOpacity={0.75}
      onPress={() => {
        methods.close();
        onDelete();
      }}
      style={styles.swipeDeleteAction}
    >
      <MaterialIcons name="delete-outline" size={18} color={theme.white} />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      leftThreshold={48}
      overshootLeft={false}
      renderLeftActions={(_progress, _translation, methods) =>
        deleteAction(methods)
      }
    >
      <View
        accessible
        accessibilityActions={[
          { name: "delete", label: `Delete ${exerciseName}` },
        ]}
        accessibilityLabel={exerciseName}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "delete") onDelete();
        }}
        style={styles.swipeRowContent}
      >
        <Text selectable style={styles.swipeRowText}>
          {exerciseName}
        </Text>
      </View>
    </ReanimatedSwipeable>
  );
}

export const SwipeToDeleteExerciseRow = memo(
  SwipeToDeleteExerciseRowComponent,
);
