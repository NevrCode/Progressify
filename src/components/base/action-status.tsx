import { IconButton } from "@/components/base/icon-button";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { FONT_FAMILIES } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export type ActionFeedback = {
  status: "success" | "error" | "info";
  title: string;
  message: string;
};

type ActionStatusProps = ActionFeedback & {
  onDismiss?: () => void;
};

export function ActionStatus({
  status,
  title,
  message,
  onDismiss,
}: ActionStatusProps) {
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const color =
    status === "success"
      ? semantics.success
      : status === "error"
        ? semantics.danger
        : semantics.info;

  return (
    <View
      accessibilityRole={status === "error" ? "alert" : "text"}
      accessibilityLabel={`${title}. ${message}`}
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: color + "0D",
          borderColor: color + "35",
        },
      ]}
    >
      <MaterialCommunityIcons
        name={
          status === "success"
            ? "check-circle-outline"
            : status === "error"
              ? "alert-circle-outline"
              : "information-outline"
        }
        size={20}
        color={color}
      />
      <View style={styles.text}>
        <Text selectable style={[styles.title, { color }]}>
          {title}
        </Text>
        <Text selectable style={[styles.message, { color: theme.text }]}>
          {message}
        </Text>
      </View>
      {onDismiss ? (
        <IconButton
          accessibilityLabel={`Dismiss ${title}`}
          variant="ghost"
          size="compact"
          visualSize={30}
          onPress={onDismiss}
          icon={
            <MaterialCommunityIcons
              name="close"
              size={17}
              color={theme.textLight}
            />
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 11,
  },
  message: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: 10,
    lineHeight: 15,
  },
});
