import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome } from "@expo/vector-icons";
import { Tabs } from "expo-router";
export default function TabsLayout() {
  const { theme } = useTheme();
  const color = gymStyles(theme).exerciseSubMeta.color;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color,
      }}
    >
      <Tabs.Screen
        name="gymProgression"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
