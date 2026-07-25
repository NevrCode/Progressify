import { THEMES } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const themeLabels: Record<string, string> = {
  coffee: "Coffee",
  forest: "Forest",
  purple: "Purple",
  ocean: "Ocean",
  green: "Green",
  darkGym: "Dark Gym",
};

const ColorDot = ({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor: string;
}) => (
  <View style={{ alignItems: "center", gap: 4 }}>
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: color,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    />
    <Text
      style={{ fontSize: 11, color: textColor, fontWeight: "600" }}
    >
      {label}
    </Text>
  </View>
);

export default function AppearanceSettings() {
  const { themeName, setThemeName, theme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView>
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            gap: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={theme.textBlack}
              />
            </TouchableOpacity>
            <Text
              style={{
                color: theme.textBlack,
                fontSize: 18,
                fontWeight: "900",
                marginLeft: 12,
              }}
            >
              Appearance
            </Text>
          </View>

          <Text
            style={{
              color: theme.textLight,
              fontSize: 11,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            Theme
          </Text>

          {Object.keys(THEMES).map((key) => {
            const currentTheme = THEMES[key as keyof typeof THEMES];
            const isActive = themeName === key;

            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="radio"
                accessibilityLabel={`${themeLabels[key] ?? key} theme`}
                accessibilityState={{ selected: isActive }}
                onPress={() => setThemeName(key as keyof typeof THEMES)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: currentTheme.background,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive
                    ? currentTheme.primary
                    : currentTheme.border,
                  gap: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: currentTheme.textBlack,
                      fontSize: 16,
                      fontWeight: "900",
                    }}
                  >
                    {themeLabels[key] ?? key}
                  </Text>
                  {isActive && (
                    <MaterialIcons
                      name="check-circle"
                      size={22}
                      color={currentTheme.primary}
                    />
                  )}
                </View>

                {/* Color preview bar */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: currentTheme.card,
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border,
                  }}
                >
                  <ColorDot color={currentTheme.primary} label="Primary" textColor={currentTheme.textLight} />
                  <ColorDot color={currentTheme.secondary} label="Accent" textColor={currentTheme.textLight} />
                  <ColorDot color={currentTheme.card} label="Card" textColor={currentTheme.textLight} />
                  <ColorDot color={currentTheme.textBlack} label="Text" textColor={currentTheme.textLight} />
                  <ColorDot color={currentTheme.expense} label="Expense" textColor={currentTheme.textLight} />
                  <ColorDot color={currentTheme.income} label="Income" textColor={currentTheme.textLight} />
                </View>

                {/* Mini button preview */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View
                    style={{
                      flex: 1,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: currentTheme.primary,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: currentTheme.card,
                      borderWidth: 1,
                      borderColor: currentTheme.border,
                    }}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
