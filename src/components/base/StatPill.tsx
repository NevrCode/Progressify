import React from "react";
import { Text, View, ViewStyle } from "react-native";

interface StatPillProps {
  label: string;
  value: string;
  color: string;
  bg: string;
  style?: ViewStyle;
}

export const StatPill: React.FC<StatPillProps> = ({
  label,
  value,
  color,
  bg,
  style,
}) => {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: bg,
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
        {label} {value}
      </Text>
    </View>
  );
};
