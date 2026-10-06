import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useExercise, useExerciseWorkouts, useDeleteExercise, useCopyExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";
import { ReportBlockMenu } from "@/components/social/ReportBlockMenu";
import { useTranslation } from "@/i18n";
import { Markdown } from "@/components/ui/Markdown";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useExercise(exerciseId);
  const { data: profile } = useProfile();
  const { data: workoutsData } = useExerciseWorkouts(exerciseId);
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4"><Text className="text-red-600 dark:text-red-400">Failed to load exercise.</Text></View>;
  }

  const exercise = data.data;
  const isOwner = profile?.data?.id === exercise.user_id;

  const confirmArchive = () => {
    Alert.alert(t("exercises.archiveConfirmTitle"), t("exercises.archiveConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("exercises.archive"), style: "destructive", onPress: () => deleteExercise.mutate(exerciseId, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{exercise.title}</Text>
      <View className="mt-1 self-start rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5">
        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{exercise.counting_type}</Text>
      </View>

      <View className="mt-3 flex-row gap-2">
        {isOwner ? (
          <>
            <Pressable onPress={() => router.push(`/exercises/${exerciseId}/edit`)} className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("common.edit")}</Text>
            </Pressable>
            <Pressable onPress={confirmArchive} className="rounded-md px-4 py-2">
              <Text className="text-sm font-medium text-red-600 dark:text-red-400">{t("exercises.archive")}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={() => copyExercise.mutate(exerciseId)} disabled={copyExercise.isPending} className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-4 py-2">
            <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">{copyExercise.isPending ? t("exercises.copying") : t("exercises.copyToMine")}</Text>
          </Pressable>
        )}
        {!isOwner && exercise.username && (
          <ReportBlockMenu username={exercise.username} targetType="exercise" targetId={exercise.id} leaveOnBlock />
        )}
      </View>

      {exercise.description && (
        <Markdown className="mt-4" textClassName="text-gray-600 dark:text-gray-400" testID="exercise-description">
          {exercise.description}
        </Markdown>
      )}

      {exercise.parents.length > 0 && (
        <View className="mt-4 flex-row flex-wrap items-center gap-x-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">{t("exercises.partOf")}</Text>
          {exercise.parents.map((parent, i) => (
            <Pressable key={parent.id} onPress={() => router.push(`/exercises/${parent.id}`)} testID={`exercise-parent-${parent.id}`}>
              <Text className="text-sm text-blue-600 dark:text-blue-400">
                {parent.title}
                {i < exercise.parents.length - 1 ? "," : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {exercise.progressions.length > 0 && (
        <View className="mt-6">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("exercises.progressionLevels")}</Text>
          <View className="mt-2 gap-1">
            {exercise.progressions.map((step, index) => (
              <Pressable
                key={step.id}
                onPress={() => router.push(`/exercises/${step.id}`)}
                testID={`exercise-progression-${step.id}`}
                className="flex-row items-center gap-2"
              >
                <View className="h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <Text className="text-xs font-medium text-gray-900 dark:text-gray-100">{index + 1}</Text>
                </View>
                <Text className="text-sm text-gray-600 dark:text-gray-400">{step.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View className="mt-8">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("exercises.recentWorkouts")}</Text>
        {workoutsData && workoutsData.data.length === 0 && (
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("exercises.neverUsed")}</Text>
        )}
        <View className="mt-2 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          {workoutsData?.data.map((w, i) => (
            <Pressable
              key={w.id}
              testID={`exercise-workout-${w.id}`}
              onPress={() => router.push(`/workouts/${w.id}`)}
              className={`flex-row items-center justify-between gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-gray-200 dark:border-gray-700" : ""}`}
            >
              <Text className="flex-1 text-sm text-gray-900 dark:text-gray-100" numberOfLines={1}>{w.title}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {w.planned_date ? new Date(`${w.planned_date}T00:00:00`).toLocaleDateString() : t("exercises.noDate")}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
