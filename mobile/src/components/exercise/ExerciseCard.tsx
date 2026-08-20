import { useMemo } from "react";
import { View, Text, Pressable, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import type { ExerciseDefinition } from "@/types";
import { useDeleteExercise, useCopyExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useCategories } from "@/hooks/use-categories";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export function ExerciseCard({ exercise }: { exercise: ExerciseDefinition }) {
  const router = useRouter();
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();
  const { data: profile } = useProfile();
  const { data: catData } = useCategories();
  const isOwner = profile?.data?.id === exercise.user_id;

  const categoryNames = useMemo(() => {
    const allCats = catData?.data ?? [];
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    return exercise.category_ids.map((id) => catMap.get(id)).filter(Boolean) as string[];
  }, [catData, exercise.category_ids]);

  const profilePicUrl = exercise.user_image_file
    ? `${API_BASE}/static/profile_pics/${exercise.user_image_file}`
    : null;

  const confirmArchive = () => {
    Alert.alert("Archive exercise", "Are you sure you want to archive this exercise?", [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: () => deleteExercise.mutate(exercise.id) },
    ]);
  };

  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row gap-3">
        {profilePicUrl ? (
          <Image source={{ uri: profilePicUrl }} className="h-10 w-10 rounded-full" />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400">
              {exercise.username?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <Pressable className="flex-1" onPress={() => router.push(`/exercises/${exercise.id}`)}>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{exercise.title}</Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            {exercise.username && <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">{exercise.username}</Text>}
            <View className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5">
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{exercise.counting_type}</Text>
            </View>
            {categoryNames.map((name) => (
              <View key={name} className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5">
                <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">{name}</Text>
              </View>
            ))}
          </View>
          {exercise.description && (
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
              {exercise.description}
            </Text>
          )}
          {exercise.progression_levels.length > 0 && (
            <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Progressions:{" "}
              {exercise.progression_levels
                .slice()
                .sort((a, b) => a.level_order - b.level_order)
                .map((l) => l.name)
                .join(" → ")}
            </Text>
          )}
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {isOwner ? (
          <>
            <Pressable onPress={() => router.push(`/exercises/${exercise.id}/edit`)} className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">Edit</Text>
            </Pressable>
            <Pressable onPress={confirmArchive} disabled={deleteExercise.isPending} className="rounded-md px-3 py-1.5">
              <Text className="text-xs font-medium text-red-600 dark:text-red-400">Archive</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={() => copyExercise.mutate(exercise.id)} disabled={copyExercise.isPending} className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5">
            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">Copy</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
