import {
  DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE,
  loadRestTimerFeedbackPreference,
  saveRestTimerFeedbackPreference,
  type RestTimerFeedbackPreference,
} from "@/features/workout-session/rest-timer-feedback";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RestTimerFeedbackSettings() {
  const router = useRouter();
  const { theme } = useTheme();
  const { alert } = useAlert();
  const [preference, setPreference] = useState<RestTimerFeedbackPreference>(
    DEFAULT_REST_TIMER_FEEDBACK_PREFERENCE,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void loadRestTimerFeedbackPreference().then((stored) => {
      if (!mounted) return;
      setPreference(stored);
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setVibrationEnabled = async (vibrationEnabled: boolean) => {
    const previous = preference;
    const next = { vibrationEnabled };
    setPreference(next);
    setIsSaving(true);
    try {
      await saveRestTimerFeedbackPreference(next);
    } catch {
      setPreference(previous);
      alert(
        "Could not save feedback preference",
        "Your rest-timer feedback setting was not changed. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <MaterialIcons name="arrow-back" size={20} color={theme.textBlack} />
          </TouchableOpacity>
          <Text
            selectable
            style={{ color: theme.textBlack, fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            Rest timer feedback
          </Text>
        </View>

        <Text selectable style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", lineHeight: 20 }}>
          Choose how this device notifies you when a rest timer finishes. Feedback only plays while the app is in the foreground.
        </Text>

        <View
          style={{
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: theme.textBlack, fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" }}>
              Vibration feedback
            </Text>
            <Text selectable style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", lineHeight: 18 }}>
              Use your device’s available vibration or haptic feedback when rest ends.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Vibration feedback"
            accessibilityHint="Turns rest timer vibration feedback on or off"
            value={preference.vibrationEnabled}
            disabled={isLoading || isSaving}
            onValueChange={(value) => void setVibrationEnabled(value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.white}
          />
        </View>

        <View
          accessibilityRole="text"
          style={{
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
            gap: 4,
            opacity: 0.7,
          }}
        >
          <Text selectable style={{ color: theme.textBlack, fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" }}>
            Audio feedback
          </Text>
          <Text selectable style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", lineHeight: 18 }}>
            Audio alerts are not available in this build. This setting will appear when the app includes an audio feedback module.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
