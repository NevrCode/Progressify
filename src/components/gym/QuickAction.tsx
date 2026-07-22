import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Text, TouchableOpacity } from "react-native";

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  label,
  onPress,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flex: 1,
        backgroundColor: theme.card,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: theme.border,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 6,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
      }}
    >
      {icon}
      <Text style={{ fontSize: 11, fontWeight: "600", color: theme.textLight }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};
