import { AppButton, type AppButtonVariant } from "@/components/base/app-button";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { FONT_FAMILIES } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import type { ReactNode } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";

export type StatePanelVariant = "empty" | "error" | "offline" | "success";

export type StatePanelAction = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

type StatePanelProps = {
  variant: StatePanelVariant;
  title: string;
  message: string;
  icon?: ReactNode;
  primaryAction?: StatePanelAction;
  secondaryAction?: StatePanelAction;
  compact?: boolean;
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function StatePanel({
  variant,
  title,
  message,
  primaryAction,
  secondaryAction,
  compact = false,
  embedded = false,
  style,
  testID,
}: StatePanelProps) {
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const accent =
    variant === "error"
      ? semantics.danger
      : variant === "offline"
        ? semantics.warning
        : variant === "success"
          ? semantics.success
          : theme.primary;
  const renderAction = (
    action: StatePanelAction,
    fallbackVariant: AppButtonVariant,
  ) => (
    <AppButton
      key={action.label}
      label={action.label}
      variant={action.variant ?? fallbackVariant}
      size={compact ? "compact" : "default"}
      loading={action.loading}
      disabled={action.disabled}
      accessibilityHint={action.accessibilityHint}
      onPress={action.onPress}
      style={{ flexGrow: 1, minWidth: compact ? 104 : 128 }}
    />
  );

  return (
    <View
      accessibilityLiveRegion={
        variant === "error" || variant === "offline" ? "polite" : "none"
      }
      testID={testID}
      style={[
        {
          backgroundColor: embedded ? "transparent" : theme.card,
          borderWidth: embedded ? 0 : 1,
          borderColor: accent + "35",
          borderRadius: 16,
          borderCurve: "continuous",
          padding: embedded ? (compact ? 8 : 12) : compact ? 14 : 20,
          alignItems: "center",
          gap: compact ? 8 : 12,
        },
        style,
      ]}
    >
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text
          accessibilityRole="header"
          selectable
          style={{
            color: theme.textBlack,
            fontSize: compact ? 14 : 16,
            fontFamily: FONT_FAMILIES.extraBold,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          selectable
          style={{
            color: theme.textLight,
            fontSize: compact ? 11 : 12,
            lineHeight: compact ? 17 : 19,
            fontFamily: FONT_FAMILIES.medium,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      </View>

      {primaryAction || secondaryAction ? (
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
            marginTop: compact ? 2 : 4,
          }}
        >
          {secondaryAction ? renderAction(secondaryAction, "secondary") : null}
          {primaryAction ? renderAction(primaryAction, "primary") : null}
        </View>
      ) : null}
    </View>
  );
}
