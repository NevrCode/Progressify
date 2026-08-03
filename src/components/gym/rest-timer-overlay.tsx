import { IconButton } from "@/components/base/icon-button";
import { ThemeType } from "@/constants/colors";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";

type RestTimerOverlayProps = {
  active: boolean;
  remainingSeconds: number;
  paused: boolean;
  initialDuration: number;
  onAdjust: (seconds: number) => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onDismiss: () => void;
  theme: ThemeType;
};

const formatRestTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function RestTimerOverlay({
  active,
  remainingSeconds,
  paused,
  initialDuration,
  onAdjust,
  onTogglePause,
  onRestart,
  onDismiss,
  theme,
}: RestTimerOverlayProps) {
  if (!active) return null;

  const finished = remainingSeconds === 0;

  return (
    <LinearGradient
      colors={
        finished
          ? [theme.income + "F2", theme.income]
          : [theme.primary + "E6", theme.primary + "FF"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: finished ? theme.income + "30" : theme.primary + "30",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <MaterialCommunityIcons
          name={
            finished
              ? "bell-ring-outline"
              : paused
                ? "timer-off-outline"
                : "timer-sand"
          }
          size={26}
          color={theme.background}
        />
        <View>
          <Text
            accessibilityLiveRegion="polite"
            accessibilityLabel={
              finished
                ? "Rest finished"
                : `${formatRestTime(remainingSeconds)} remaining${
                    paused ? ", paused" : ""
                  }`
            }
            style={{
              color: theme.background,
              fontSize: 11,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              opacity: 0.9,
            }}
          >
            {finished ? "Rest Finished" : "Rest Timer"}
          </Text>
          <Text
            style={{
              color: theme.background,
              fontSize: 22,
              fontWeight: "900",
              letterSpacing: -0.5,
              marginTop: 1,
              fontVariant: ["tabular-nums"],
            }}
          >
            {finished ? "Go Lift!" : formatRestTime(remainingSeconds)}
          </Text>
        </View>
      </View>

      {remainingSeconds > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Reduce rest timer by 30 seconds"
            hitSlop={7}
            onPress={() => onAdjust(-30)}
            style={timerAdjustmentStyle(theme)}
          >
            <Text style={timerAdjustmentTextStyle(theme)}>-30s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Increase rest timer by 30 seconds"
            hitSlop={7}
            onPress={() => onAdjust(30)}
            style={timerAdjustmentStyle(theme)}
          >
            <Text style={timerAdjustmentTextStyle(theme)}>+30s</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Restart rest timer for ${initialDuration} seconds`}
            hitSlop={7}
            onPress={onRestart}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: theme.background,
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "row",
              gap: 4,
            }}
          >
            <MaterialIcons name="replay" size={14} color={theme.income} />
            <Text style={{ color: theme.income, fontSize: 11, fontWeight: "900" }}>
              Restart
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {remainingSeconds > 0 ? (
          <IconButton
            accessibilityLabel={paused ? "Resume rest timer" : "Pause rest timer"}
            icon={
              <MaterialCommunityIcons
                name={paused ? "play" : "pause"}
                size={20}
                color={theme.primary}
              />
            }
            onPress={onTogglePause}
            visualSize={36}
          />
        ) : null}
        <IconButton
          accessibilityLabel="Dismiss rest timer"
          icon={
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={theme.background}
            />
          }
          onPress={onDismiss}
          style={{ backgroundColor: theme.background + "20" }}
          variant="ghost"
          visualSize={36}
        />
      </View>
    </LinearGradient>
  );
}

const timerAdjustmentStyle = (theme: ThemeType) => ({
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: theme.background + "20",
  justifyContent: "center" as const,
  alignItems: "center" as const,
});

const timerAdjustmentTextStyle = (theme: ThemeType) => ({
  color: theme.background,
  fontSize: 11,
  fontWeight: "900" as const,
});
