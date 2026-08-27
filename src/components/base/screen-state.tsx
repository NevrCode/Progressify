import { gymStyles } from "@/assets/styles/gym.style";
import { AppButton } from "@/components/base/app-button";
import type { ThemeType } from "@/constants/colors";
import { memo, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

/**
 * The full-screen loading and error states three of the gym screens rendered
 * identically before their own return statements. Kept here so a change to the
 * shape of either state lands on every screen at once.
 */

type ScreenStateProps = {
  theme: ThemeType;
};

export const ScreenLoading = memo(function ScreenLoading({
  message,
  theme,
}: ScreenStateProps & { message: string }) {
  const styles = useMemo(() => gymStyles(theme), [theme]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
});

export const ScreenError = memo(function ScreenError({
  title,
  message,
  actionLabel,
  onAction,
  theme,
}: ScreenStateProps & {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const styles = useMemo(() => gymStyles(theme), [theme]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorText}>{message}</Text>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
});
