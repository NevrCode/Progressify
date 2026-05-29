import { COLORS } from "@/constants/colors";
import { Stack } from "expo-router";

export default function pagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: "#272727",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 16,
        },
        headerTitleAlign: "center",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="appearance"
        options={{
          title: "Appearance",
        }}
      />
      <Stack.Screen
        name="manageWorkoutSession"
        options={{
          title: "Manage Workout Session",
        }}
      />
    </Stack>
  );
}
