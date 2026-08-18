import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/new" options={{ title: "New Workout" }} />
      <Stack.Screen name="workouts/[id]/index" options={{ title: "Workout" }} />
      <Stack.Screen name="workouts/[id]/edit" options={{ title: "Edit Workout" }} />
      <Stack.Screen name="categories" options={{ title: "Categories" }} />
      <Stack.Screen name="exercises/index" options={{ title: "Exercises" }} />
      <Stack.Screen name="exercises/new" options={{ title: "New Exercise" }} />
      <Stack.Screen name="exercises/[id]/index" options={{ title: "Exercise" }} />
      <Stack.Screen name="exercises/[id]/edit" options={{ title: "Edit Exercise" }} />
      <Stack.Screen name="templates/index" options={{ title: "Templates" }} />
      <Stack.Screen name="templates/new" options={{ title: "New Template" }} />
      <Stack.Screen name="templates/[id]/edit" options={{ title: "Edit Template" }} />
      <Stack.Screen name="users/[username]" options={{ title: "Profile" }} />
      <Stack.Screen name="messages/new" options={{ title: "New Message" }} />
    </Stack>
  );
}
