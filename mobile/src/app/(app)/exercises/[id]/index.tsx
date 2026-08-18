import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useExercise, useDeleteExercise, useCopyExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useExercise(exerciseId);
  const { data: profile } = useProfile();
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white p-4"><Text className="text-red-600">Failed to load exercise.</Text></View>;
  }

  const exercise = data.data;
  const isOwner = profile?.data?.id === exercise.user_id;

  const confirmArchive = () => {
    Alert.alert("Archive exercise", "Are you sure you want to archive this exercise?", [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: () => deleteExercise.mutate(exerciseId, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-2xl font-bold">{exercise.title}</Text>
      <View className="mt-1 self-start rounded-full bg-gray-100 px-2.5 py-0.5">
        <Text className="text-xs font-medium text-gray-600">{exercise.counting_type}</Text>
      </View>

      <View className="mt-3 flex-row gap-2">
        {isOwner ? (
          <>
            <Pressable onPress={() => router.push(`/exercises/${exerciseId}/edit`)} className="rounded-md bg-gray-100 px-4 py-2">
              <Text className="text-sm font-medium text-gray-600">Edit</Text>
            </Pressable>
            <Pressable onPress={confirmArchive} className="rounded-md px-4 py-2">
              <Text className="text-sm font-medium text-red-600">Archive</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={() => copyExercise.mutate(exerciseId)} disabled={copyExercise.isPending} className="rounded-md bg-blue-50 px-4 py-2">
            <Text className="text-sm font-medium text-blue-600">{copyExercise.isPending ? "Copying..." : "Copy to mine"}</Text>
          </Pressable>
        )}
      </View>

      {exercise.description && <Text className="mt-4 text-gray-600">{exercise.description}</Text>}

      {exercise.progression_levels.length > 0 && (
        <View className="mt-6">
          <Text className="text-sm font-semibold text-gray-700">Progression levels</Text>
          <View className="mt-2 gap-1">
            {exercise.progression_levels.slice().sort((a, b) => a.level_order - b.level_order).map((level) => (
              <View key={level.id} className="flex-row items-center gap-2">
                <View className="h-5 w-5 items-center justify-center rounded-full bg-gray-100">
                  <Text className="text-xs font-medium">{level.level_order}</Text>
                </View>
                <Text className="text-sm text-gray-600">{level.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
