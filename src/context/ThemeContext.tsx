import { THEMES } from "@/constants/colors";
import React, { createContext, useContext, useState } from "react";

type ThemeName = keyof typeof THEMES;

interface ThemeContextType {
  theme: typeof THEMES.darkGym;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.darkGym,
  themeName: "darkGym",
  setThemeName: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>("darkGym");

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
