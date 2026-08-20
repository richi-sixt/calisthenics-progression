import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import type { Workout } from "@/types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export function ExploreWorkoutCard({ workout }: { workout: Workout }) {
  const router = useRouter();
  const exerciseCount = workout.exercises?.length ?? 0;
  const profilePicUrl = workout.user_image_file ? `${API_BASE}/static/profile_pics/${workout.user_image_file}` : null;

  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row gap-3">
          {workout.username && (
            <Pressable onPress={() => router.push(`/users/${workout.username}`)}>
              {profilePicUrl ? (
                <Image source={{ uri: profilePicUrl }} className="h-10 w-10 rounded-full" />
              ) : (
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                  <Text className="text-sm font-bold text-gray-500 dark:text-gray-400">{workout.username[0]?.toUpperCase() ?? "?"}</Text>
                </View>
              )}
            </Pressable>
          )}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{workout.title}</Text>
            <View className="mt-1 flex-row flex-wrap items-center gap-2">
              {workout.username && (
                <Pressable onPress={() => router.push(`/users/${workout.username}`)}>
                  <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">@{workout.username}</Text>
                </Pressable>
              )}
              {workout.timestamp && <Text className="text-sm text-gray-500 dark:text-gray-400">{new Date(workout.timestamp).toLocaleDateString()}</Text>}
              <Text className="text-sm text-gray-500 dark:text-gray-400">{exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}</Text>
            </View>
            {workout.exercises && workout.exercises.length > 0 && (
              <View className="mt-2 gap-0.5">
                {workout.exercises.map((ex, i) => {
                  const sets = ex.sets ?? [];
                  return (
                    <Text key={ex.id} className="text-sm text-gray-600 dark:text-gray-400">
                      <Text className="text-gray-400 dark:text-gray-500">{i + 1}. </Text>
                      <Text className="font-medium">{ex.exercise_definition_title ?? "Exercise"}</Text>
                      <Text className="text-gray-400 dark:text-gray-500"> — </Text>
                      {sets.length} {sets.length === 1 ? "set" : "sets"}
                    </Text>
                  );
                })}
              </View>
            )}
          </View>
        </View>
        {workout.is_done && (
          <View className="ml-4 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5">
            <Text className="text-xs font-medium text-green-700 dark:text-green-400">Done</Text>
          </View>
        )}
      </View>
    </View>
  );
}
