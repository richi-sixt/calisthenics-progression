import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import { useWorkout, useToggleDone, useDeleteWorkout, useUpdateWorkout } from "@/hooks/use-workouts";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { useTranslation } from "@/i18n";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const { data, isLoading, error } = useWorkout(workoutId);
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();
  const updateWorkout = useUpdateWorkout();
  const [replanOpen, setReplanOpen] = useState(false);
  const [replanMonth, setReplanMonth] = useState(() => new Date());

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
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const isPlanned =
    !!workout.planned_date && workout.planned_date > todayIso && !workout.is_done;

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
      {isPlanned && (
        <Text className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
          {t("workouts.plannedFor", {
            date: formatDate(parseISO(workout.planned_date!), "long"),
          })}
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
          onPress={() => setReplanOpen(true)}
          testID="replan-button"
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2"
        >
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t("workouts.replan")}
          </Text>
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

      <Modal
        visible={replanOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReplanOpen(false)}
      >
        <View className="flex-1 bg-white dark:bg-gray-900 pt-4">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("workouts.replan")}
            </Text>
            <Pressable onPress={() => setReplanOpen(false)} testID="replan-modal-close">
              <Text className="text-sm text-blue-600 dark:text-blue-400">{t("common.cancel")}</Text>
            </Pressable>
          </View>
          <View className="px-4">
            <MonthCalendar
              month={replanMonth}
              onMonthChange={setReplanMonth}
              selectedDate={workout.planned_date}
              onSelectDate={(date) => {
                if (date) {
                  updateWorkout.mutate({ id: workoutId, planned_date: date });
                  setReplanOpen(false);
                }
              }}
              markedDates={new Set()}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
