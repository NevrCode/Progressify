import { useTheme } from "@/context/ThemeContext";
import { Text, TouchableOpacity, View } from "react-native";

export type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel = "Selection",
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        backgroundColor: theme.background,
        borderRadius: 24,
        padding: 4,
        borderWidth: 1.5,
        borderColor: theme.border,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            activeOpacity={0.76}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              minHeight: 44,
              paddingHorizontal: 8,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? theme.primary + "12" : "transparent",
              borderWidth: selected ? 1.5 : 0,
              borderColor: theme.primary + "30",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? theme.primary : theme.textLight,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_800ExtraBold",
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
