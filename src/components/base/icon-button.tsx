import { useTheme } from "@/context/ThemeContext";
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
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  accessibilityLabel,
  icon,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  const { theme } = useTheme();
  const destructive = variant === "destructive";
  const ghost = variant === "ghost";
  const color = destructive ? theme.expense : theme.primary;
  const unavailable = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      activeOpacity={0.72}
      disabled={unavailable}
      style={[
        {
          width: 35,
          height: 35,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ghost ? "transparent" : color + "15",
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
