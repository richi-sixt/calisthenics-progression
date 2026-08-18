import { ScrollView, View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkout, useUpdateWorkout } from "@/hooks/use-workouts";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useWorkout(workoutId);
  const updateWorkout = useUpdateWorkout();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-red-600">Failed to load workout.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      <WorkoutForm
        defaultValues={data.data}
        isPending={updateWorkout.isPending}
        submitLabel="Save Changes"
        onSubmit={(formData) => {
          updateWorkout.mutate({ id: workoutId, ...formData }, { onSuccess: () => router.back() });
        }}
      />
    </ScrollView>
  );
}
