import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";

interface WeekStreakProps {
  filledDays: boolean[];
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export const WeekStreak: React.FC<WeekStreakProps> = ({ filledDays }) => {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
      {DAY_LABELS.map((d, i) => {
        const isFilled = filledDays[i];
        return isFilled ? (
          <LinearGradient
            key={i}
            colors={[theme.primary + "CC", theme.primary]}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: theme.white,
              }}
            >
              {d}
            </Text>
          </LinearGradient>
        ) : (
          <View
            key={i}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: theme.textLight,
              }}
            >
              {d}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
