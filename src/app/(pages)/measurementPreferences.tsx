import { AppButton } from "@/components/base/app-button";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import type { MeasurementSystem } from "@/utils/measurement-units";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const choices: { system: MeasurementSystem; title: string; description: string }[] = [
  { system: "METRIC", title: "Metric", description: "Kilograms and centimetres" },
  { system: "IMPERIAL", title: "Imperial", description: "Pounds and feet/inches" },
];

export default function MeasurementPreferences() {
  const router = useRouter();
  const { theme } = useTheme();
  const { alert } = useAlert();
  const { measurementSystem, isLoading, setMeasurementSystem } = useUnitPreference();

  const select = async (system: MeasurementSystem) => {
    try {
      await setMeasurementSystem(system);
    } catch {
      alert("Could not save preference", "Your measurement preference was not changed. Please try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
          >
            <MaterialIcons name="arrow-back" size={20} color={theme.textBlack} />
          </TouchableOpacity>
          <Text style={{ color: theme.textBlack, fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" }}>Measurements</Text>
        </View>
        <Text style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", lineHeight: 20 }}>
          This only changes how values are displayed. Your workout and body-measurement history stays stored in kilograms and centimetres.
        </Text>
        {choices.map((choice) => {
          const selected = choice.system === measurementSystem;
          return (
            <AppButton
              key={choice.system}
              label={choice.title}
              description={choice.description}
              variant={selected ? "primary" : "secondary"}
              loading={isLoading && selected}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => void select(choice.system)}
              rightIcon={selected ? <MaterialIcons name="check-circle" size={20} color={selected ? theme.white : theme.primary} /> : undefined}
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
}
