import { AnimatedTabIcon } from "@/components/navigation/animated-tab-icon";
import { useTheme } from "@/context/ThemeContext";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabsLayout() {
  const { theme } = useTheme();
  const color = theme.primary;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.textLight,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          height: 54,
          justifyContent: "center",
        },
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          height: 58,
          marginHorizontal: 18,
          marginBottom: Platform.OS === "ios" ? 18 : 14,
          paddingHorizontal: 8,
          paddingTop: 9,
          paddingBottom: 9,
          borderRadius: 30,
          position: "absolute",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              family="font-awesome"
              name="home"
              label="Home"
              focused={focused}
              activeColor={theme.primary}
              inactiveColor={theme.textLight}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gymProgression"
        options={{
          tabBarLabel: "Gym",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              family="font-awesome"
              name="bar-chart"
              label="Gym"
              focused={focused}
              activeColor={theme.primary}
              inactiveColor={theme.textLight}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="foodDiary"
        options={{
          tabBarLabel: "Food Diary",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              family="material"
              name="restaurant"
              label="Food"
              focused={focused}
              activeColor={theme.primary}
              inactiveColor={theme.textLight}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              family="font-awesome"
              name="user"
              label="Me"
              focused={focused}
              activeColor={theme.primary}
              inactiveColor={theme.textLight}
            />
          ),
        }}
      />
    </Tabs>
  );
}
