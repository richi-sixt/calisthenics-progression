import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkout, useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useWorkout(workoutId);
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();

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

  const workout = data.data;

  const confirmDelete = () => {
    Alert.alert("Delete workout", "Are you sure you want to delete this workout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteWorkout.mutate(workoutId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-2xl font-bold">{workout.title}</Text>
      {workout.timestamp && (
        <Text className="mt-1 text-sm text-gray-500">
          {new Date(workout.timestamp).toLocaleString()}
        </Text>
      )}

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => router.push(`/workouts/${workoutId}/edit`)}
          className="rounded-md bg-gray-100 px-4 py-2"
        >
          <Text className="text-sm font-medium text-gray-600">Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => toggleDone.mutate(workoutId)}
          disabled={toggleDone.isPending}
          className={`rounded-md px-4 py-2 ${workout.is_done ? "bg-green-100" : "bg-gray-100"}`}
        >
          <Text className={`text-sm font-medium ${workout.is_done ? "text-green-700" : "text-gray-600"}`}>
            {workout.is_done ? "Completed" : "Mark as done"}
          </Text>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleteWorkout.isPending} className="rounded-md px-4 py-2">
          <Text className="text-sm font-medium text-red-600">Delete</Text>
        </Pressable>
      </View>

      {workout.exercises && workout.exercises.length > 0 ? (
        <View className="mt-6 gap-4">
          {workout.exercises.map((exercise) => (
            <View key={exercise.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <Text className="font-semibold text-gray-900">
                {exercise.exercise_definition_title ?? `Exercise #${exercise.exercise_order}`}
              </Text>

              {exercise.sets && exercise.sets.length > 0 ? (
                <View className="mt-3">
                  <View className="flex-row border-b border-gray-200 pb-2">
                    <Text className="flex-1 text-xs font-medium text-gray-500">Set</Text>
                    <Text className="flex-1 text-xs font-medium text-gray-500">Progression</Text>
                    <Text className="flex-1 text-xs font-medium text-gray-500">
                      {exercise.counting_type === "duration" ? "Duration" : "Reps"}
                    </Text>
                  </View>
                  {exercise.sets.map((set) => (
                    <View key={set.id} className="flex-row border-b border-gray-100 py-2">
                      <Text className="flex-1 text-sm text-gray-600">{set.set_order}</Text>
                      <Text className="flex-1 text-sm text-gray-700">{set.progression ?? "-"}</Text>
                      <Text className="flex-1 text-sm text-gray-700">
                        {exercise.counting_type === "duration"
                          ? set.duration_formatted || (set.duration ? `${set.duration}s` : "-")
                          : (set.reps ?? "-")}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-2 text-sm text-gray-400">No sets recorded.</Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-6 text-gray-500">No exercises in this workout.</Text>
      )}
    </ScrollView>
  );
}
