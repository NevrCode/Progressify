import { useTheme } from "@/context/ThemeContext";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { getHighestContrastColor } from "@/utils/color-contrast";
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
  size?: "compact" | "default";
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  description?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  variant = "primary",
  size = "default",
  loading = false,
  leftIcon,
  rightIcon,
  description,
  disabled,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: AppButtonProps) {
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const destructive = variant === "destructive";
  const primary = variant === "primary";
  const ghost = variant === "ghost";
  const foreground = primary
    ? getHighestContrastColor(theme.primary, [
        theme.background,
        theme.textBlack,
        theme.white,
        theme.shadow,
      ])
    : destructive
      ? semantics.danger
      : theme.primary;
  const backgroundColor = primary
    ? theme.primary
    : destructive
      ? semantics.danger + "15"
      : ghost
        ? "transparent"
        : theme.primary + "12";
  const borderColor = primary
    ? theme.primary
    : destructive
      ? semantics.danger + "35"
      : ghost
        ? "transparent"
        : theme.primary + "30";
  const unavailable = disabled || loading;
  const compact = size === "compact";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint ?? description}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      activeOpacity={0.75}
      disabled={unavailable}
      hitSlop={compact ? 4 : undefined}
      style={[
        {
          minHeight: compact ? 36 : 44,
          paddingHorizontal: compact ? 12 : 16,
          paddingVertical: compact ? 7 : 11,
          borderRadius: compact ? 10 : 12,
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
                fontSize: compact ? 12 : 13,
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
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}
