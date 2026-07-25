import {
  isThemeName,
  THEMES,
  type ThemeType,
  type ThemeName,
} from "@/constants/colors";
import "expo-sqlite/localStorage/install";
import React, { createContext, useCallback, useContext, useState } from "react";

export const THEME_STORAGE_KEY = "progressify.theme";

export const readStoredThemeName = (): ThemeName => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme && isThemeName(storedTheme) ? storedTheme : "darkGym";
  } catch {
    return "darkGym";
  }
};

export const persistThemeName = (themeName: ThemeName) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  } catch {
    // Keep theme switching functional when device storage is unavailable.
  }
};

interface ThemeContextType {
  theme: ThemeType;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.darkGym,
  themeName: "darkGym",
  setThemeName: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeNameState] =
    useState<ThemeName>(readStoredThemeName);
  const setThemeName = useCallback((nextThemeName: ThemeName) => {
    setThemeNameState(nextThemeName);
    persistThemeName(nextThemeName);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: THEMES[themeName],
        themeName,
        setThemeName,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
