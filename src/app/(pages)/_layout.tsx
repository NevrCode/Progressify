import { Stack } from "expo-router";

export default function PagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="appearance" />
      <Stack.Screen name="manageWorkoutSession" />
      <Stack.Screen name="workoutSession" />
      <Stack.Screen name="activeWorkoutSession" />
    </Stack>
  );
}
