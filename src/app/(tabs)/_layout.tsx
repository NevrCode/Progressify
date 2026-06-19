import { useTheme } from "@/context/ThemeContext";
import { usePatchNotes } from "@/hooks/usePatchNote";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
export default function TabsLayout() {
  const { theme } = useTheme();
  const color = theme.primary;
  const { showPopup, latestPatch, markAsSeen } = usePatchNotes();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.textLight,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gymProgression"
        options={{
          tabBarLabel: "Gym",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="foodDiary"
        options={{
          tabBarLabel: "Food Diary",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="restaurant" size={size} color={color} />
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
