import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type SelectionCardProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  description?: string;
  icon?: ReactNode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SelectionCard({
  label,
  selected,
  onPress,
  description,
  icon,
  compact = false,
  style,
}: SelectionCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ selected }}
      activeOpacity={0.76}
      onPress={onPress}
      style={[
        {
          minHeight: 44,
          paddingHorizontal: compact ? 12 : 14,
          paddingVertical: compact ? 9 : 12,
          borderRadius: 12,
          borderCurve: "continuous",
          borderWidth: 1.5,
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.primary + "12" : theme.card,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        style,
      ]}
    >
      {icon}
      <View style={{ flex: 1, gap: description ? 3 : 0 }}>
        <Text
          style={{
            color: selected ? theme.primary : theme.textBlack,
            fontSize: 13,
            fontFamily: "PlusJakartaSans_700Bold",
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              color: theme.textLight,
              fontSize: 12,
              lineHeight: 17,
              fontFamily: "PlusJakartaSans_500Medium",
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <MaterialIcons name="check-circle" size={20} color={theme.primary} />
      ) : null}
    </TouchableOpacity>
  );
}
