import { IconButton } from "@/components/base/icon-button";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { ShimmerSkeleton } from "@/components/base/shimmer-skeleton";
import { StatePanel } from "@/components/base/state-panel";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { FONT_FAMILIES } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import type { OnboardingStep } from "@/utils/onboarding";
import { getOnboardingProgress } from "@/utils/onboarding";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type OnboardingChecklistProps = {
  steps: OnboardingStep[];
  loading?: boolean;
  collapsed?: boolean;
  reviewMode?: boolean;
  unavailable?: boolean;
  onStepPress: (step: OnboardingStep) => void;
  onRetry: () => void;
  onCollapse: () => void;
  onExpand: () => void;
  onDismiss: () => void;
};

export function OnboardingChecklist({
  steps,
  loading = false,
  collapsed = false,
  reviewMode = false,
  unavailable = false,
  onStepPress,
  onRetry,
  onCollapse,
  onExpand,
  onDismiss,
}: OnboardingChecklistProps) {
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const progress = getOnboardingProgress(steps);

  return (
    <ShadowGlowCard
      accessibilityLabel={`Setup progress, ${progress.completed} of ${progress.total} complete`}
      style={{ gap: 14 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              (progress.allComplete ? semantics.success : theme.primary) + "18",
          }}
        >
          <MaterialCommunityIcons
            name={progress.allComplete ? "check-all" : "clipboard-check-outline"}
            size={22}
            color={progress.allComplete ? semantics.success : theme.primary}
          />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.textBlack,
              fontSize: 15,
              fontFamily: FONT_FAMILIES.extraBold,
            }}
          >
            {progress.allComplete ? "Setup complete" : "Finish your setup"}
          </Text>
          <Text
            style={{
              color: theme.textLight,
              fontSize: 11,
              fontFamily: FONT_FAMILIES.medium,
            }}
          >
            {progress.completed} of {progress.total} completed
            {reviewMode ? " · review mode" : ""}
          </Text>
        </View>

        <IconButton
          accessibilityLabel={
            collapsed ? "Expand setup checklist" : "Collapse setup checklist"
          }
          variant="ghost"
          size="compact"
          visualSize={32}
          icon={
            <MaterialCommunityIcons
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color={theme.textLight}
            />
          }
          onPress={collapsed ? onExpand : onCollapse}
        />
        <IconButton
          accessibilityLabel="Hide setup checklist"
          variant="ghost"
          size="compact"
          visualSize={32}
          icon={
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={theme.textLight}
            />
          }
          onPress={onDismiss}
        />
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Setup completion progress"
        accessibilityValue={{
          min: 0,
          max: progress.total,
          now: progress.completed,
        }}
        style={{
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.border,
        }}
      >
        <View
          style={{
            width: `${progress.percentage}%`,
            height: "100%",
            borderRadius: 3,
            backgroundColor: progress.allComplete
              ? semantics.success
              : theme.primary,
          }}
        />
      </View>

      {!collapsed ? (
        unavailable ? (
          <StatePanel
            variant="offline"
            compact
            embedded
            title="Setup progress unavailable"
            message="Progressify could not verify your setup data. Your existing information has not been changed."
            primaryAction={{ label: "Retry", onPress: onRetry }}
          />
        ) : loading ? (
          <View
            accessibilityLabel="Loading setup progress"
            accessibilityRole="progressbar"
            style={{ gap: 10 }}
          >
            {[0, 1, 2].map((item) => (
              <View
                key={item}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <ShimmerSkeleton width={30} height={30} borderRadius={10} />
                <View style={{ flex: 1, gap: 6 }}>
                  <ShimmerSkeleton width="58%" height={11} />
                  <ShimmerSkeleton width="82%" height={8} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {steps.map((step) => (
              <TouchableOpacity
                key={step.key}
                accessibilityRole="checkbox"
                accessibilityLabel={step.title}
                accessibilityHint={
                  step.completed
                    ? "This setup step is complete"
                    : step.description
                }
                accessibilityState={{ checked: step.completed }}
                activeOpacity={step.completed ? 1 : 0.72}
                disabled={step.completed}
                onPress={() => onStepPress(step)}
                style={{
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 7,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: step.completed
                    ? semantics.success + "0D"
                    : "transparent",
                }}
              >
                <MaterialCommunityIcons
                  name={
                    step.completed
                      ? "check-circle"
                      : "checkbox-blank-circle-outline"
                  }
                  size={22}
                  color={
                    step.completed ? semantics.success : theme.textLight
                  }
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: step.completed
                        ? semantics.success
                        : theme.textBlack,
                      fontSize: 12,
                      fontFamily: FONT_FAMILIES.bold,
                    }}
                  >
                    {step.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.textLight,
                      fontSize: 10,
                      lineHeight: 15,
                      fontFamily: FONT_FAMILIES.medium,
                    }}
                  >
                    {step.description}
                  </Text>
                </View>
                {!step.completed ? (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.primary}
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : null}
    </ShadowGlowCard>
  );
}
