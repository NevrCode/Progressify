import { AppButton } from "@/components/base/app-button";
import { useTheme } from "@/context/ThemeContext";
import type { CatalogExercise } from "@/types/exercise-catalog";
import { ScrollView, Text, View } from "react-native";

type ExerciseCatalogPreviewProps = {
  exercise: CatalogExercise;
  onBack: () => void;
  onUseExercise: (exercise: CatalogExercise) => void;
};

export function ExerciseCatalogPreview({
  exercise,
  onBack,
  onUseExercise,
}: ExerciseCatalogPreviewProps) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ maxHeight: 390 }}
        contentContainerStyle={{ gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 5 }}>
          <Text
            selectable
            style={{
              color: theme.textBlack,
              fontSize: 18,
              fontFamily: "PlusJakartaSans_800ExtraBold",
            }}
          >
            {exercise.name}
          </Text>
          <Text
            selectable
            style={{
              color: theme.primary,
              fontSize: 12,
              fontFamily: "PlusJakartaSans_700Bold",
              textTransform: "capitalize",
            }}
          >
            {[exercise.primaryMuscle, exercise.equipment, exercise.level]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>

        {exercise.secondaryMuscles.length > 0 ? (
          <View style={{ gap: 5 }}>
            <Text
              style={{
                color: theme.textBlack,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              Also works
            </Text>
            <Text
              selectable
              style={{
                color: theme.textLight,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_500Medium",
                textTransform: "capitalize",
                lineHeight: 18,
              }}
            >
              {exercise.secondaryMuscles.join(", ")}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: theme.textBlack,
              fontSize: 12,
              fontFamily: "PlusJakartaSans_700Bold",
            }}
          >
            Instructions
          </Text>
          {exercise.instructions.length > 0 ? (
            exercise.instructions.map((instruction, index) => (
              <View
                key={`${exercise.id}-${index}`}
                style={{ flexDirection: "row", gap: 9 }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 12,
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {index + 1}.
                </Text>
                <Text
                  selectable
                  style={{
                    flex: 1,
                    color: theme.textLight,
                    fontSize: 12,
                    fontFamily: "PlusJakartaSans_500Medium",
                    lineHeight: 18,
                  }}
                >
                  {instruction}
                </Text>
              </View>
            ))
          ) : (
            <Text selectable style={{ color: theme.textLight, fontSize: 12 }}>
              No instructions are available for this exercise.
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <AppButton
          label="Back"
          variant="secondary"
          onPress={onBack}
          style={{ flex: 1 }}
        />
        <AppButton
          label="Use exercise"
          onPress={() => onUseExercise(exercise)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
