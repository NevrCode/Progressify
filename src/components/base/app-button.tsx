import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleProp,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from "react-native";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "ghost";

type AppButtonProps = Omit<TouchableOpacityProps, "style"> & {
  label: string;
  variant?: AppButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
  description?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  variant = "primary",
  loading = false,
  leftIcon,
  description,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const { theme } = useTheme();
  const destructive = variant === "destructive";
  const primary = variant === "primary";
  const ghost = variant === "ghost";
  const foreground = primary
    ? theme.background
    : destructive
      ? theme.expense
      : theme.primary;
  const backgroundColor = primary
    ? theme.primary
    : destructive
      ? theme.expense + "15"
      : ghost
        ? "transparent"
        : theme.primary + "12";
  const borderColor = primary
    ? theme.primary
    : destructive
      ? theme.expense + "35"
      : ghost
        ? "transparent"
        : theme.primary + "30";
  const unavailable = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      activeOpacity={0.75}
      disabled={unavailable}
      style={[
        {
          minHeight: 44,
          paddingHorizontal: 16,
          paddingVertical: 11,
          borderRadius: 12,
          borderCurve: "continuous",
          borderWidth: ghost ? 0 : 1.5,
          borderColor,
          backgroundColor,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: unavailable ? 0.5 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <>
          {leftIcon}
          <View style={description ? { flex: 1, gap: 2 } : undefined}>
            <Text
              style={{
                color: foreground,
                fontSize: 13,
                fontFamily: "PlusJakartaSans_800ExtraBold",
                textAlign: description ? "left" : "center",
              }}
            >
              {label}
            </Text>
            {description ? (
              <Text
                style={{
                  color: foreground,
                  opacity: 0.72,
                  fontSize: 11,
                  fontFamily: "PlusJakartaSans_500Medium",
                }}
              >
                {description}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}
