import type { ThemeType } from "@/constants/colors";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import type { UserProfileResponse } from "@/services/nutritionService";
import { formatHeight, formatMass } from "@/utils/measurement-units";
import { Text, View } from "react-native";

type NutritionProfileOverviewProps = {
  profile: UserProfileResponse;
  theme: ThemeType;
};

type ProfileMetricProps = {
  label: string;
  value: string | undefined;
  theme: ThemeType;
};

function ProfileMetric({ label, value, theme }: ProfileMetricProps) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          fontFamily: "PlusJakartaSans_700Bold",
          color: theme.textLight,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "900",
          fontFamily: "PlusJakartaSans_800ExtraBold",
          color: theme.textBlack,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider({ theme }: Pick<NutritionProfileOverviewProps, "theme">) {
  return <View style={{ width: 1, backgroundColor: theme.border + "50" }} />;
}

export function NutritionProfileOverview({
  profile,
  theme,
}: NutritionProfileOverviewProps) {
  const { measurementSystem } = useUnitPreference();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: theme.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1.5,
        borderColor: theme.primary + "20",
        marginBottom: 8,
      }}
    >
      <ProfileMetric label="Weight" value={formatMass(profile.weight_kg, measurementSystem)} theme={theme} />
      <Divider theme={theme} />
      <ProfileMetric label="Height" value={formatHeight(profile.height_cm, measurementSystem)} theme={theme} />
      <Divider theme={theme} />
      <ProfileMetric
        label="TDEE"
        value={profile.calculated_tdee?.toFixed(0)}
        theme={theme}
      />
      <Divider theme={theme} />
      <ProfileMetric label="Goal" value={profile.goal_type} theme={theme} />
    </View>
  );
}
