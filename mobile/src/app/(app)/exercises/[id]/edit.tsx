import { ScrollView, View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useExercise, useUpdateExercise } from "@/hooks/use-exercises";
import { ExerciseForm } from "@/components/exercise/ExerciseForm";

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useExercise(exerciseId);
  const updateExercise = useUpdateExercise();

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4"><Text className="text-red-600 dark:text-red-400">Failed to load exercise.</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <ExerciseForm
        defaultValues={data.data}
        isPending={updateExercise.isPending}
        onSubmit={(formData) => {
          updateExercise.mutate(
            { id: exerciseId, ...formData, progression_levels: formData.progression_levels.map((p) => p.name) },
            { onSuccess: () => router.back() }
          );
        }}
      />
    </ScrollView>
  );
}
