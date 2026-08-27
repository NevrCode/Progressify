import { IconButton } from "@/components/base/icon-button";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type DateNavigatorProps = {
  label: string;
  supportingLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
  onLabelPress?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
};

export function DateNavigator({
  label,
  supportingLabel,
  onPrevious,
  onNext,
  onLabelPress,
  previousDisabled,
  nextDisabled,
}: DateNavigatorProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.background,
        borderRadius: 16,
        borderCurve: "continuous",
        padding: 8,
        borderWidth: 1.5,
        borderColor: theme.primary + "20",
      }}
    >
      <IconButton
        accessibilityLabel="Previous date"
        disabled={previousDisabled}
        onPress={onPrevious}
        style={{ width: 44, height: 44 }}
        icon={
          <MaterialIcons name="chevron-left" size={22} color={theme.primary} />
        }
      />
      <TouchableOpacity
        accessibilityRole={onLabelPress ? "button" : "text"}
        accessibilityLabel={label}
        disabled={!onLabelPress}
        onPress={onLabelPress}
        activeOpacity={0.72}
        style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text
          style={{
            color: theme.textBlack,
            fontSize: 16,
            fontFamily: "PlusJakartaSans_800ExtraBold",
          }}
        >
          {label}
        </Text>
        {supportingLabel ? (
          <Text
            style={{
              color: theme.textLight,
              fontSize: 10,
              fontFamily: "PlusJakartaSans_700Bold",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            {supportingLabel}
          </Text>
        ) : null}
      </TouchableOpacity>
      <IconButton
        accessibilityLabel="Next date"
        disabled={nextDisabled}
        onPress={onNext}
        style={{ width: 44, height: 44 }}
        icon={
          <MaterialIcons name="chevron-right" size={22} color={theme.primary} />
        }
      />
    </View>
  );
}
