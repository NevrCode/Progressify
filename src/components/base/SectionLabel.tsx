import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Text, TextProps } from "react-native";

interface SectionLabelProps extends TextProps {
  children: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <Text
      style={[
        {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: theme.textLight,
          marginTop: 8,
          marginBottom: 8,
          marginHorizontal: 4,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
