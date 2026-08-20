import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useCreateExercise } from "@/hooks/use-exercises";
import { ExerciseForm } from "@/components/exercise/ExerciseForm";

export default function NewExerciseScreen() {
  const router = useRouter();
  const createExercise = useCreateExercise();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <ExerciseForm
        isPending={createExercise.isPending}
        onSubmit={(data) => {
          createExercise.mutate(
            { ...data, progression_levels: data.progression_levels.map((p) => p.name) },
            { onSuccess: () => router.back() }
          );
        }}
      />
    </ScrollView>
  );
}
