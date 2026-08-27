import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import type { ThemeType } from "@/constants/colors";
import { displayMass, massUnitLabel } from "@/utils/measurement-units";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type Props = {
  routineName?: string | null;
  elapsed: string;
  totalSets: number;
  totalVolume: number;
  onDone: () => void;
  theme: ThemeType;
};

export function ActiveWorkoutCompletion({
  routineName,
  elapsed,
  totalSets,
  totalVolume,
  onDone,
  theme,
}: Props) {
  const { measurementSystem } = useUnitPreference();
  const styles = gymStyles(theme);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center", flex: 1 }]}>
          <MaterialCommunityIcons name="check-circle" size={72} color={theme.primary} />
          <Text style={[styles.title, { textAlign: "center", marginTop: 16 }]}>Session Complete</Text>
          <Text style={[styles.exerciseMeta, { textAlign: "center", marginTop: 8 }]}>
            {routineName ?? "Manual Workout"} | {elapsed} | {totalSets} sets | {displayMass(totalVolume, measurementSystem, 0)} {massUnitLabel(measurementSystem)}-reps
          </Text>
          <AppButton
            label="Done"
            accessibilityLabel="Close completed workout"
            onPress={onDone}
            style={{ marginTop: 32, width: "100%" }}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
