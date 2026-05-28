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
  teriary: string;
  textBlack: string;
  bar: string;
}

const coffeeTheme: ThemeType = {
  primary: "#8B593E",
  secondary: "#A47148",
  teriary: "#C4A484",

  background: "#FFF8F3",

  text: "#4A3428",
  textBlack: "#2B1D17",
  textLight: "#9A8478",

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
  teriary: "#81C784",

  background: "#E8F5E9",

  text: "#1B5E20",
  textBlack: "#102914",
  textLight: "#66BB6A",

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
  teriary: "#BA68C8",

  background: "#F4EEF5",

  text: "#4A148C",
  textBlack: "#2A0A4D",
  textLight: "#BA68C8",

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
  teriary: "#4FC3F7",

  background: "#E1F5FE",

  text: "#01579B",
  textBlack: "#01344F",
  textLight: "#4FC3F7",

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
  teriary: "#D68223",

  background: "#F5FFF7",

  text: "#2E933C",
  textBlack: "#212221",
  textLight: "#36AD46",

  border: "#299437",

  white: "#FFFFFF",

  expense: "#EF5350",
  income: "#81C14B",

  card: "#FFFFFF",
  shadow: "#000000",
  bar: "#0e6b1a",
};

export const THEMES: Record<string, ThemeType> = {
  coffee: coffeeTheme,
  forest: forestTheme,
  purple: purpleTheme,
  ocean: oceanTheme,
  green: greenTheme,
};
export const COLORS = THEMES.green;
