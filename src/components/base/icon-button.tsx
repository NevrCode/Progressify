import { useTheme } from "@/context/ThemeContext";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";

type IconButtonVariant = "primary" | "neutral" | "destructive" | "ghost";

type IconButtonProps = Omit<
  TouchableOpacityProps,
  "accessibilityLabel" | "children" | "style"
> & {
  accessibilityLabel: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: "compact" | "default" | "large";
  visualSize?: number;
  selected?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  accessibilityLabel,
  icon,
  variant = "primary",
  size = "default",
  visualSize: requestedVisualSize,
  selected = false,
  loading = false,
  disabled,
  style,
  hitSlop,
  ...props
}: IconButtonProps) {
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const destructive = variant === "destructive";
  const ghost = variant === "ghost";
  const color = destructive ? semantics.danger : theme.primary;
  const unavailable = disabled || loading;
  const visualSize =
    requestedVisualSize ?? (size === "compact" ? 32 : size === "large" ? 44 : 35);
  const effectiveHitSlop = Math.max(0, Math.ceil((44 - visualSize) / 2));

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled: unavailable,
        busy: loading,
        selected,
      }}
      activeOpacity={0.72}
      disabled={unavailable}
      hitSlop={hitSlop ?? effectiveHitSlop}
      style={[
        {
          width: visualSize,
          height: visualSize,
          borderRadius: size === "large" ? 14 : 12,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            ghost && !selected ? "transparent" : color + (selected ? "22" : "15"),
          borderWidth: variant === "neutral" ? 1.5 : 0,
          borderColor: theme.border,
          opacity: unavailable ? 0.45 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : icon}
    </TouchableOpacity>
  );
}
