import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { View, ViewProps } from "react-native";

interface ShadowGlowCardProps extends ViewProps {
  glowColor?: string | null;
}

export const ShadowGlowCard: React.FC<ShadowGlowCardProps> = ({
  children,
  style,
  glowColor,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: glowColor ?? theme.border,
          padding: 16,
          shadowColor: glowColor ?? theme.shadow,
          shadowOffset: glowColor
            ? { width: 0, height: 4 }
            : { width: 0, height: 4 },
          shadowOpacity: glowColor ? 0.15 : 0.04,
          shadowRadius: glowColor ? 6 : 10,
          elevation: glowColor ? 4 : 2,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
