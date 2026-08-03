import { AppButton } from "@/components/base/app-button";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import type { ProgressionRecommendationDTO } from "@/services/gymService";
import { formatMass } from "@/utils/measurement-units";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type Props = {
  exerciseName: string;
  recommendation?: ProgressionRecommendationDTO;
  disabled?: boolean;
  onApply: () => void;
};

const actionLabels: Record<ProgressionRecommendationDTO["action"], string> = {
  INCREASE_WEIGHT: "Increase weight",
  ADD_REPS: "Add reps",
  MAINTAIN: "Maintain load",
  REDUCE_WEIGHT: "Reduce weight",
  INSUFFICIENT_DATA: "Keep training",
};

export function ProgressionRecommendationCard({
  exerciseName,
  recommendation,
  disabled = false,
  onApply,
}: Props) {
  const { theme } = useTheme();
  const { measurementSystem } = useUnitPreference();

  if (
    !recommendation ||
    recommendation.action === "INSUFFICIENT_DATA" ||
    recommendation.suggested_weight == null
  ) {
    return null;
  }

  const target = `${formatMass(recommendation.suggested_weight, measurementSystem)} × ${recommendation.target_reps_min}-${recommendation.target_reps_max}`;

  return (
    <View
      accessibilityLabel={`Progression suggestion for ${exerciseName}`}
      style={{
        backgroundColor: theme.primary + "0D",
        borderColor: theme.primary + "35",
        borderRadius: 14,
        borderCurve: "continuous",
        borderWidth: 1,
        gap: 10,
        marginTop: 12,
        padding: 12,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
        <MaterialCommunityIcons
          name="trending-up"
          size={19}
          color={theme.primary}
        />
        <View style={{ flex: 1 }}>
          <Text
            selectable
            style={{
              color: theme.primary,
              fontFamily: "PlusJakartaSans_800ExtraBold",
              fontSize: 11,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {actionLabels[recommendation.action]} · {recommendation.confidence.toLowerCase()} confidence
          </Text>
          <Text
            selectable
            style={{
              color: theme.textBlack,
              fontFamily: "PlusJakartaSans_800ExtraBold",
              fontSize: 17,
              marginTop: 2,
            }}
          >
            {target}
          </Text>
        </View>
      </View>

      <Text
        selectable
        style={{
          color: theme.textLight,
          fontFamily: "PlusJakartaSans_500Medium",
          fontSize: 11,
          lineHeight: 17,
        }}
      >
        {recommendation.reason}
      </Text>

      <AppButton
        accessibilityHint={`Fills ${recommendation.target_sets} working sets for ${exerciseName}. You can edit them before saving.`}
        disabled={disabled}
        label="Apply suggestion"
        onPress={onApply}
        size="compact"
        variant="secondary"
      />
    </View>
  );
}
