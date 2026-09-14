import { useState } from "react";
import { View, Text, Pressable, Alert, Modal } from "react-native";
import { useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import type { Workout, Exercise } from "@/types";
import { useToggleDone, useDeleteWorkout, useUpdateWorkout } from "@/hooks/use-workouts";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { useTranslation, type TranslationKey } from "@/i18n";

function formatSetSummary(exercise: Exercise, t: (key: TranslationKey) => string): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return t("workouts.noSets");

  const totalReps = sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalDuration = sets.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const parts: string[] = [`${sets.length} ${sets.length === 1 ? t("workouts.set") : t("workouts.sets")}`];
  if (totalReps > 0) parts.push(`${totalReps} ${t("workouts.reps")}`);
  if (totalDuration > 0) {
    const mins = Math.floor(totalDuration / 60);
    const secs = totalDuration % 60;
    parts.push(mins > 0 ? `${mins}m ${secs}s` : `${totalDuration}s`);
  }
  return parts.join(" · ");
}

export function WorkoutCard({ workout }: { workout: Workout }) {
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();
  const updateWorkout = useUpdateWorkout();
  const [replanOpen, setReplanOpen] = useState(false);
  const [replanMonth, setReplanMonth] = useState(() => new Date());

  const todayIso = format(new Date(), "yyyy-MM-dd");
  const isPlanned =
    !!workout.planned_date && workout.planned_date > todayIso && !workout.is_done;

  const confirmDelete = () => {
    Alert.alert(t("workouts.deleteConfirmTitle"), t("workouts.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteWorkout.mutate(workout.id) },
    ]);
  };

  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <Pressable onPress={() => router.push(`/workouts/${workout.id}`)}>
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{workout.title}</Text>
          <View className={`rounded-full px-2 py-0.5 ${workout.is_done ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"}`}>
            <Text className={`text-xs font-medium ${workout.is_done ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"}`}>
              {workout.is_done ? t("workouts.done") : t("workouts.pendent")}
            </Text>
          </View>
          <View
            className={`rounded-full px-2 py-0.5 ${
              workout.visibility === "public"
                ? "bg-blue-100 dark:bg-blue-900/30"
                : workout.visibility === "followers"
                  ? "bg-indigo-100 dark:bg-indigo-900/30"
                  : "bg-gray-100 dark:bg-gray-700"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                workout.visibility === "public"
                  ? "text-blue-700 dark:text-blue-400"
                  : workout.visibility === "followers"
                    ? "text-indigo-700 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {workout.visibility === "public"
                ? t("workouts.public")
                : workout.visibility === "followers"
                  ? t("workouts.followers")
                  : t("workouts.private")}
            </Text>
          </View>
        </View>
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
      </Pressable>

      {workout.exercises && workout.exercises.length > 0 && (
        <View className="mt-2 gap-0.5">
          {workout.exercises.map((ex, i) => (
            <Text key={ex.id} className="text-sm text-gray-600 dark:text-gray-400">
              <Text className="text-gray-400 dark:text-gray-500">{i + 1}. </Text>
              <Text className="font-medium">{ex.exercise_definition_title ?? t("workouts.exercise")}</Text>
              <Text className="text-gray-400 dark:text-gray-500"> — </Text>
              {formatSetSummary(ex, t)}
            </Text>
          ))}
        </View>
      )}

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => toggleDone.mutate(workout.id)}
          disabled={toggleDone.isPending}
          className={`rounded-md px-3 py-1.5 ${workout.is_done ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
        >
          <Text className={`text-xs font-medium ${workout.is_done ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}>
            {workout.is_done ? t("workouts.done") : t("workouts.markDone")}
          </Text>
        </Pressable>
        <View className="flex-row overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
          {(["public", "followers", "private"] as const).map((opt) => (
            <Pressable
              key={opt}
              onPress={() => updateWorkout.mutate({ id: workout.id, visibility: opt })}
              disabled={updateWorkout.isPending}
              testID={`visibility-option-${workout.id}-${opt}`}
              className={`px-2.5 py-1.5 ${workout.visibility === opt ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-700"}`}
            >
              <Text className={`text-xs font-medium ${workout.visibility === opt ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>
                {opt === "public" ? t("workouts.public") : opt === "followers" ? t("workouts.followers") : t("workouts.private")}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => setReplanOpen(true)}
          testID={`replan-button-${workout.id}`}
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {t("workouts.replan")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/workouts/${workout.id}/edit`)}
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("common.edit")}</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleteWorkout.isPending} className="rounded-md px-3 py-1.5">
          <Text className="text-xs font-medium text-red-600 dark:text-red-400">{t("common.delete")}</Text>
        </Pressable>
      </View>

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
                  updateWorkout.mutate({ id: workout.id, planned_date: date });
                  setReplanOpen(false);
                }
              }}
              markedDates={new Set()}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
