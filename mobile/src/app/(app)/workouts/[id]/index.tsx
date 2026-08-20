import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkout, useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";
import { useTranslation } from "@/i18n";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const { data, isLoading, error } = useWorkout(workoutId);
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4">
        <Text className="text-red-600 dark:text-red-400">{t("workouts.loadError")}</Text>
      </View>
    );
  }

  const workout = data.data;

  const confirmDelete = () => {
    Alert.alert(t("workouts.deleteConfirmTitle"), t("workouts.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => deleteWorkout.mutate(workoutId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{workout.title}</Text>
      {workout.timestamp && (
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatDate(workout.timestamp, "dateTime")}
        </Text>
      )}

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => router.push(`/workouts/${workoutId}/edit`)}
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2"
        >
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("common.edit")}</Text>
        </Pressable>
        <Pressable
          onPress={() => toggleDone.mutate(workoutId)}
          disabled={toggleDone.isPending}
          className={`rounded-md px-4 py-2 ${workout.is_done ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
        >
          <Text className={`text-sm font-medium ${workout.is_done ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}>
            {workout.is_done ? t("workouts.completed") : t("workouts.markAsDone")}
          </Text>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleteWorkout.isPending} className="rounded-md px-4 py-2">
          <Text className="text-sm font-medium text-red-600 dark:text-red-400">{t("common.delete")}</Text>
        </Pressable>
      </View>

      {workout.exercises && workout.exercises.length > 0 ? (
        <View className="mt-6 gap-4">
          {workout.exercises.map((exercise) => (
            <View key={exercise.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {exercise.exercise_definition_title ?? `${t("workouts.exercise")} #${exercise.exercise_order}`}
              </Text>

              {exercise.sets && exercise.sets.length > 0 ? (
                <View className="mt-3">
                  <View className="flex-row border-b border-gray-200 dark:border-gray-700 pb-2">
                    <Text className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">{t("workouts.set")}</Text>
                    <Text className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">{t("workouts.progression")}</Text>
                    <Text className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {exercise.counting_type === "duration" ? t("workouts.duration") : t("workouts.reps")}
                    </Text>
                  </View>
                  {exercise.sets.map((set) => (
                    <View key={set.id} className="flex-row border-b border-gray-100 dark:border-gray-700 py-2">
                      <Text className="flex-1 text-sm text-gray-600 dark:text-gray-400">{set.set_order}</Text>
                      <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">{set.progression ?? "-"}</Text>
                      <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {exercise.counting_type === "duration"
                          ? set.duration_formatted || (set.duration ? `${set.duration}s` : "-")
                          : (set.reps ?? "-")}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">{t("workouts.noSetsRecorded")}</Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-6 text-gray-500 dark:text-gray-400">{t("workouts.noExercises")}</Text>
      )}
    </ScrollView>
  );
}
