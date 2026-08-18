import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import type { Workout, Exercise } from "@/types";
import { useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";

function formatSetSummary(exercise: Exercise): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return "No sets";

  const totalReps = sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalDuration = sets.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const parts: string[] = [`${sets.length} set${sets.length === 1 ? "" : "s"}`];
  if (totalReps > 0) parts.push(`${totalReps} reps`);
  if (totalDuration > 0) {
    const mins = Math.floor(totalDuration / 60);
    const secs = totalDuration % 60;
    parts.push(mins > 0 ? `${mins}m ${secs}s` : `${totalDuration}s`);
  }
  return parts.join(" · ");
}

export function WorkoutCard({ workout }: { workout: Workout }) {
  const router = useRouter();
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();

  const confirmDelete = () => {
    Alert.alert("Delete workout", "Are you sure you want to delete this workout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteWorkout.mutate(workout.id) },
    ]);
  };

  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4">
      <Pressable onPress={() => router.push(`/workouts/${workout.id}`)}>
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-lg font-semibold text-gray-900">{workout.title}</Text>
          <View className={`rounded-full px-2 py-0.5 ${workout.is_done ? "bg-green-100" : "bg-yellow-100"}`}>
            <Text className={`text-xs font-medium ${workout.is_done ? "text-green-700" : "text-yellow-700"}`}>
              {workout.is_done ? "Done" : "Pending"}
            </Text>
          </View>
        </View>
        {workout.timestamp && (
          <Text className="mt-1 text-sm text-gray-500">
            {new Date(workout.timestamp).toLocaleString()}
          </Text>
        )}
      </Pressable>

      {workout.exercises && workout.exercises.length > 0 && (
        <View className="mt-2 gap-0.5">
          {workout.exercises.map((ex, i) => (
            <Text key={ex.id} className="text-sm text-gray-600">
              <Text className="text-gray-400">{i + 1}. </Text>
              <Text className="font-medium">{ex.exercise_definition_title ?? "Exercise"}</Text>
              <Text className="text-gray-400"> — </Text>
              {formatSetSummary(ex)}
            </Text>
          ))}
        </View>
      )}

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => toggleDone.mutate(workout.id)}
          disabled={toggleDone.isPending}
          className={`rounded-md px-3 py-1.5 ${workout.is_done ? "bg-green-100" : "bg-gray-100"}`}
        >
          <Text className={`text-xs font-medium ${workout.is_done ? "text-green-700" : "text-gray-600"}`}>
            {workout.is_done ? "Done" : "Mark done"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/workouts/${workout.id}/edit`)}
          className="rounded-md bg-gray-100 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-gray-600">Edit</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleteWorkout.isPending} className="rounded-md px-3 py-1.5">
          <Text className="text-xs font-medium text-red-600">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
