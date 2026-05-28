import { THEMES } from "@/constants/colors";
import React, { createContext, useContext, useState } from "react";

type ThemeName = keyof typeof THEMES;

interface ThemeContextType {
  theme: typeof THEMES.green;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.green,
  themeName: "green",
  setThemeName: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>("green");

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
