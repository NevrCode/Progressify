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

const darkGymTheme: ThemeType = {
  primary: "#00E676",
  secondary: "#00C853",
  tertiary: "#1B5E20",

  background: "#0A0A0A",

  text: "#E0E0E0",
  textBlack: "#FAFAFA",
  textLight: "#929292",

  border: "#1E1E1E",

  white: "#FFFFFF",

  expense: "#FF5252",
  income: "#69F0AE",

  card: "#161616",
  shadow: "#000000",
  bar: "#00E676",
};

export const THEMES = {
  coffee: coffeeTheme,
  forest: forestTheme,
  purple: purpleTheme,
  ocean: oceanTheme,
  green: greenTheme,
  darkGym: darkGymTheme,
} as const satisfies Record<string, ThemeType>;
export type ThemeName = keyof typeof THEMES;

export const isThemeName = (value: string): value is ThemeName =>
  Object.prototype.hasOwnProperty.call(THEMES, value);

export const COLORS = THEMES.darkGym;
