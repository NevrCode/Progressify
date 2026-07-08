import { AnimatedProgressBar } from "@/components/animations/animated-progress-bar";
import React from "react";

interface ProgressBarProps {
  value: number;
  max: number;
  color: string;
  trackColor?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  color,
  trackColor = "#eee",
  height = 7,
}) => {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <AnimatedProgressBar
      color={color}
      progress={pct}
      trackColor={trackColor}
      height={height}
    />
  );
};
