import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/new" options={{ title: "New Workout" }} />
      <Stack.Screen name="workouts/[id]/index" options={{ title: "Workout" }} />
      <Stack.Screen name="workouts/[id]/edit" options={{ title: "Edit Workout" }} />
    </Stack>
  );
}
