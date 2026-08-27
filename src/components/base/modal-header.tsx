import { IconButton } from "@/components/base/icon-button";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";

type ModalHeaderProps = {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  supportingText?: string;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ModalHeader({
  title,
  onClose,
  closeLabel = "Close",
  supportingText,
  leading,
  style,
}: ModalHeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        },
        style,
      ]}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.textBlack,
            fontSize: 18,
            fontFamily: "PlusJakartaSans_800ExtraBold",
          }}
        >
          {title}
        </Text>
        {supportingText ? (
          <Text
            style={{
              color: theme.textLight,
              fontSize: 12,
              fontFamily: "PlusJakartaSans_500Medium",
            }}
          >
            {supportingText}
          </Text>
        ) : null}
      </View>
      <IconButton
        accessibilityLabel={closeLabel}
        icon={
          <MaterialIcons name="close" size={20} color={theme.textLight} />
        }
        onPress={onClose}
        size="compact"
        variant="ghost"
      />
    </View>
  );
}

