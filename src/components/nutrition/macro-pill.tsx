import type { GymStyles } from "@/assets/styles/gym.style";
import { memo } from "react";
import { Text, View } from "react-native";

type MacroPillProps = {
  label: string;
  value?: number;
  unit: string;
  bg: string;
  color: string;
  styles: GymStyles;
};

/**
 * A small rounded pill showing one macro value (calories, protein, etc).
 *
 * Memoized: meal prep rows and draft item cards render up to four of these
 * each, and their inputs (label/value/unit/bg/color) rarely change together.
 */
function MacroPillComponent({
  label,
  value,
  unit,
  bg,
  color,
  styles,
}: MacroPillProps) {
  return (
    <View style={[styles.macroPillBase, { backgroundColor: bg }]}>
      <Text style={[styles.macroPillText, { color }]}>
        {label}
        {label ? " " : ""}
        {value?.toFixed(0) ?? "0"}
        {unit}
      </Text>
    </View>
  );
}

export const MacroPill = memo(MacroPillComponent);
