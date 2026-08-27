// constants/colors.js
export interface ThemeType {
  primary: string;
  background: string;
  text: string;
  border: string;
  white: string;
  textLight: string;
  expense: string;
  income: string;
  card: string;
  shadow: string;

  secondary: string;
  tertiary: string;
  textBlack: string;
  bar: string;
}

const coffeeTheme: ThemeType = {
  primary: "#8B593E",
  secondary: "#A47148",
  tertiary: "#C4A484",

  background: "#FFF8F3",

  text: "#4A3428",
  textBlack: "#2B1D17",
  textLight: "#765F54",

  border: "#E5D3B7",

  white: "#FFFFFF",

  expense: "#E74C3C",
  income: "#2ECC71",

  card: "#FFFFFF",
  shadow: "#000000",
  bar: "#663921",
};

const forestTheme: ThemeType = {
  primary: "#2E7D32",
  secondary: "#43A047",
  tertiary: "#81C784",

  background: "#E8F5E9",

  text: "#1B5E20",
  textBlack: "#102914",
  textLight: "#3F7042",

  border: "#C8E6C9",

  white: "#FFFFFF",

  expense: "#C62828",
  income: "#388E3C",

  card: "#FFFFFF",
  shadow: "#000000",
  bar: "#2E7D32",
};

const purpleTheme: ThemeType = {
  primary: "#6A1B9A",
  secondary: "#8E24AA",
  tertiary: "#BA68C8",

  background: "#F4EEF5",

  text: "#4A148C",
  textBlack: "#2A0A4D",
  textLight: "#76537D",

  border: "#D1C4E9",

  white: "#FFFFFF",

  expense: "#D32F2F",
  income: "#388E3C",

  card: "#FFFFFF",
  shadow: "#000000",
  bar: "#540785",
};

const oceanTheme: ThemeType = {
  primary: "#0277BD",
  secondary: "#80D8FF",
  tertiary: "#4FC3F7",

  background: "#E1F5FE",

  text: "#01579B",
  textBlack: "#01344F",
  textLight: "#3B6F83",

  border: "#B3E5FC",

  white: "#FFFFFF",

  expense: "#EF5350",
  income: "#26A69A",

  card: "#FFFFFF",
  shadow: "#000000",

  bar: "#064264",
};

const greenTheme: ThemeType = {
  primary: "#2E933C",
  secondary: "#2C8A51",
  tertiary: "#D68223",

  background: "#F5FFF7",

  text: "#2E933C",
  textBlack: "#212221",
  textLight: "#44734A",

  border: "#299437",

  white: "#FFFFFF",

  expense: "#EF5350",
  income: "#81C14B",

  card: "#FFFFFF",
  shadow: "#000000",
  bar: "#0e6b1a",
};

// Signature identity theme — the app's default. Electric lime green against
// near-black: energetic and "alive" rather than the muted/serious tone most
// fitness apps default to, chosen deliberately over an earlier orange
// version during a design pass. `secondary` keeps a warm orange accent for
// contrast (e.g. secondary CTA tiles) so the palette isn't monochrome-green;
// `tertiary` is a brighter electric-lime pop reserved for small accents
// (badges, the fiber macro bar) that shouldn't compete with `primary`.
// `income` is intentionally cyan, not green, so "positive/on-track" reads as
// a distinct signal from the primary brand color rather than a duplicate of
// it. This is the one color combination meant to be recognizably
// "Progressify"; the other themes below exist as optional alternates, not
// competing identities.
const darkGymTheme: ThemeType = {
  primary: "#22C55E",
  secondary: "#FB923C",
  tertiary: "#84CC16",

  background: "#0A0A0A",

  text: "#E5E5E5",
  textBlack: "#FAFAFA",
  textLight: "#9A9A9A",

  border: "#1E1E1E",

  white: "#FFFFFF",

  expense: "#FF4D4D",
  income: "#22D3EE",

  card: "#161616",
  shadow: "#000000",
  bar: "#22C55E",
};

export const THEMES = {
  darkGym: darkGymTheme,
  coffee: coffeeTheme,
  forest: forestTheme,
  purple: purpleTheme,
  ocean: oceanTheme,
  green: greenTheme,
} as const satisfies Record<string, ThemeType>;
export type ThemeName = keyof typeof THEMES;

export const isThemeName = (value: string): value is ThemeName =>
  Object.prototype.hasOwnProperty.call(THEMES, value);

export const COLORS = THEMES.darkGym;
