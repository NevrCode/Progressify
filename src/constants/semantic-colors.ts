import type { ThemeType } from "@/constants/colors";
import { relativeLuminance } from "@/utils/color-contrast";

export type NutritionAccents = {
  calories: string;
  protein: string;
  carbohydrate: string;
  fat: string;
  water: string;
};

const darkSurfaceAccents: NutritionAccents = {
  calories: "#F2994A",
  protein: "#A566E5",
  carbohydrate: "#3498DB",
  fat: "#F2C94C",
  water: "#3498DB",
};

const lightSurfaceAccents: NutritionAccents = {
  calories: "#9A4F0B",
  protein: "#6F2DA8",
  carbohydrate: "#15608F",
  fat: "#765A00",
  water: "#15608F",
};

export const getNutritionAccents = (
  background: string,
): NutritionAccents =>
  relativeLuminance(background) < 0.35
    ? darkSurfaceAccents
    : lightSurfaceAccents;

export type ThemeSemantics = {
  success: string;
  danger: string;
  warning: string;
  info: string;
  selectedSurface: string;
  disabledContent: string;
  disabledSurface: string;
};

export type SkeletonColors = {
  base: string;
  highlight: string;
};

const darkSurfaceSemantics = {
  success: "#69F0AE",
  danger: "#FF7B7B",
  warning: "#F2C94C",
  info: "#5AB0E6",
} as const;

const lightSurfaceSemantics = {
  success: "#287A4B",
  danger: "#B42318",
  warning: "#765A00",
  info: "#15608F",
} as const;

const darkSkeletonColors: SkeletonColors = {
  base: "#2C2C2C",
  highlight: "#3A5A46",
};

const lightSkeletonColors: SkeletonColors = {
  base: "#D9DEDA",
  highlight: "#C5D8CA",
};

export const getThemeSemantics = (theme: ThemeType): ThemeSemantics => {
  const surface = theme.card || theme.background || "#FFFFFF";
  const palette =
    relativeLuminance(surface) < 0.35
      ? darkSurfaceSemantics
      : lightSurfaceSemantics;

  return {
    ...palette,
    selectedSurface: theme.primary + "18",
    disabledContent: theme.textLight,
    disabledSurface: theme.border + "80",
  };
};

export const getSkeletonColors = (theme: ThemeType): SkeletonColors =>
  relativeLuminance(theme.card || theme.background || "#FFFFFF") < 0.35
    ? darkSkeletonColors
    : lightSkeletonColors;
