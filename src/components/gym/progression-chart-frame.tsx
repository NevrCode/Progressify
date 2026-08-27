import type { ProgressionChartSummary } from "@/utils/progression-chart-summary";
import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

type ProgressionChartFrameProps = PropsWithChildren<
  Omit<
    ViewProps,
    "accessible" | "accessibilityLabel" | "accessibilityRole"
  > & {
    summary: ProgressionChartSummary;
  }
>;

export function ProgressionChartFrame({
  summary,
  children,
  ...viewProps
}: ProgressionChartFrameProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary.accessibilityLabel}
      {...viewProps}
    >
      {children}
    </View>
  );
}
