export const FONT_FAMILIES = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
} as const;

/**
 * Condensed display face reserved for stat numerals — 1RM, volume, calories,
 * macros, session counts. Never used for body copy or UI chrome; the
 * condensed cut only reads well at large sizes (20px+) and short digit runs.
 * This is the app's one deliberate typographic identity marker, distinct
 * from PlusJakartaSans everywhere else.
 */
export const STAT_FONT_FAMILIES = {
  semibold: "BarlowCondensed_600SemiBold",
  bold: "BarlowCondensed_700Bold",
  extraBold: "BarlowCondensed_800ExtraBold",
  black: "BarlowCondensed_900Black",
} as const;

