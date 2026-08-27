import { useTheme } from "@/context/ThemeContext";
import type { CatalogExercise } from "@/types/exercise-catalog";
import { MaterialIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type ExerciseCatalogListItemProps = {
  exercise: CatalogExercise;
  onPress: (exercise: CatalogExercise) => void;
  favorite?: boolean;
  onToggleFavorite?: (exercise: CatalogExercise, favorite: boolean) => void;
};

export const ExerciseCatalogListItem = memo(
  function ExerciseCatalogListItem({
    exercise,
    onPress,
    favorite = false,
    onToggleFavorite,
  }: ExerciseCatalogListItemProps) {
    const { theme } = useTheme();

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`View ${exercise.name}`}
        activeOpacity={0.72}
        onPress={() => onPress(exercise)}
        style={{
          minHeight: 64,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderRadius: 12,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.background,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 11,
            borderCurve: "continuous",
            backgroundColor: theme.primary + "16",
          }}
        >
          <Text
            style={{
              color: theme.primary,
              fontSize: 14,
              fontFamily: "PlusJakartaSans_800ExtraBold",
            }}
          >
            {exercise.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            selectable
            numberOfLines={2}
            style={{
              color: theme.textBlack,
              fontSize: 13,
              fontFamily: "PlusJakartaSans_700Bold",
            }}
          >
            {exercise.name}
          </Text>
          <Text
            selectable
            numberOfLines={1}
            style={{
              color: theme.textLight,
              fontSize: 11,
              fontFamily: "PlusJakartaSans_500Medium",
              textTransform: "capitalize",
            }}
          >
            {[exercise.primaryMuscle, exercise.equipment]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        {onToggleFavorite ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${favorite ? "Remove" : "Add"} ${exercise.name} ${favorite ? "from" : "to"} favorite exercises`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite(exercise, !favorite);
            }}
          >
            <MaterialIcons
              name={favorite ? "star" : "star-border"}
              size={22}
              color={favorite ? theme.primary : theme.textLight}
            />
          </TouchableOpacity>
        ) : null}
        <Text
          importantForAccessibility="no"
          style={{ color: theme.primary, fontSize: 20 }}
        >
          ›
        </Text>
      </TouchableOpacity>
    );
  },
);
