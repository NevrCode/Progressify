import { SyncStatusBadge } from "@/components/base/SyncStatusBadge";
import { IconButton } from "@/components/base/icon-button";
import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";
import {
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";

type PageHeaderBaseProps = {
  eyebrow: string;
  title: string;
  showSyncStatus?: boolean;
  style?: StyleProp<ViewStyle>;
};

type PageHeaderProps = PageHeaderBaseProps &
  (
    | {
        icon: ReactNode;
        onIconPress: () => void;
        iconAccessibilityLabel: string;
      }
    | {
        icon?: ReactNode;
        onIconPress?: never;
        iconAccessibilityLabel?: never;
      }
  );

export function PageHeader({
  eyebrow,
  title,
  icon,
  showSyncStatus = true,
  onIconPress,
  iconAccessibilityLabel,
  style,
}: PageHeaderProps) {
  const { theme } = useTheme();
  const iconStyle: ViewStyle = {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: theme.primary + "15",
    borderWidth: 1.5,
    borderColor: theme.primary + "30",
    justifyContent: "center",
    alignItems: "center",
  };

  return (
    <View
      style={[
        {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        },
        style,
      ]}
    >
      <View style={{ flexShrink: 1 }}>
        <Text
          style={{
            color: theme.textLight,
            fontSize: 12,
            fontFamily: "PlusJakartaSans_800ExtraBold",
            textTransform: "uppercase",
            letterSpacing: 1.5,
            marginBottom: 2,
          }}
        >
          {eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.textBlack,
            fontSize: 28,
            fontFamily: "PlusJakartaSans_800ExtraBold",
            letterSpacing: -0.8,
          }}
        >
          {title}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {showSyncStatus && <SyncStatusBadge />}
        {icon && onIconPress ? (
          <IconButton
            accessibilityLabel={iconAccessibilityLabel}
            onPress={onIconPress}
            icon={icon}
            style={iconStyle}
          />
        ) : icon ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={iconStyle}
          >
            {icon}
          </View>
        ) : null}
      </View>
    </View>
  );
}
