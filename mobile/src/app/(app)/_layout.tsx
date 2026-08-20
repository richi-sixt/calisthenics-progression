import { Stack } from "expo-router";
import { useTranslation } from "@/i18n";

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/new" options={{ title: t("workouts.new") }} />
      <Stack.Screen name="workouts/[id]/index" options={{ title: "Workout" }} />
      <Stack.Screen name="workouts/[id]/edit" options={{ title: t("workouts.editTitle") }} />
      <Stack.Screen name="categories" options={{ title: t("categories.title") }} />
      <Stack.Screen name="exercises/index" options={{ title: t("exercises.title") }} />
      <Stack.Screen name="exercises/new" options={{ title: t("exercises.new") }} />
      <Stack.Screen name="exercises/[id]/index" options={{ title: "Exercise" }} />
      <Stack.Screen name="exercises/[id]/edit" options={{ title: t("exercises.editTitle") }} />
      <Stack.Screen name="templates/index" options={{ title: t("templates.title") }} />
      <Stack.Screen name="templates/new" options={{ title: t("templates.new") }} />
      <Stack.Screen name="templates/[id]/edit" options={{ title: t("templates.editTitle") }} />
      <Stack.Screen name="users/[username]" options={{ title: t("profile.title") }} />
      <Stack.Screen name="messages/new" options={{ title: t("messages.new") }} />
    </Stack>
  );
}
