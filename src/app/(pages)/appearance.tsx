import { THEMES } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { Text, TouchableOpacity, View } from "react-native";

export default function AppearanceSettings() {
  const { themeName, setThemeName, theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        backgroundColor: theme.background,
      }}
    >
      {Object.keys(THEMES).map((key) => {
        const currentTheme = THEMES[key as keyof typeof THEMES];

        return (
          <TouchableOpacity
            key={key}
            onPress={() => setThemeName(key as keyof typeof THEMES)}
            style={{
              backgroundColor: currentTheme.primary,
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: themeName === key ? 2 : 0,
              borderColor: "#080808",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {key} Theme
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
