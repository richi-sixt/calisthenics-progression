import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { parseISO } from "date-fns";
import { useTranslation } from "@/i18n";
import { formatSkillValue } from "@/components/skill/format";
import type { SkillExercise } from "@/types";

/** One exercise of a skill with the best result vs. the target; green when reached. */
export function SkillExerciseRow({
  exercise,
  index,
  isNext,
}: {
  exercise: SkillExercise;
  index: number;
  isNext: boolean;
}) {
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const percent = Math.min(100, Math.round((exercise.best / exercise.target_value) * 100));

  return (
    <Pressable
      testID={`skill-exercise-${exercise.exercise_id}`}
      onPress={() => router.push(`/exercises/${exercise.exercise_id}`)}
      className={`rounded-lg border px-4 py-3 ${
        exercise.reached
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <View className="flex-row items-center gap-2">
        <View
          className={`h-6 w-6 items-center justify-center rounded-full ${
            exercise.reached ? "bg-green-600" : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          <Text className={`text-xs font-medium ${exercise.reached ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
            {exercise.reached ? "✓" : index + 1}
          </Text>
        </View>
        <Text className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>
          {exercise.title}
        </Text>
        {isNext && (
          <View className="rounded-full bg-blue-100 px-2 py-0.5 dark:bg-blue-900/30">
            <Text className="text-xs font-medium text-blue-700 dark:text-blue-400">{t("skills.next")}</Text>
          </View>
        )}
      </View>
      <View className="mt-2 flex-row items-center gap-3">
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <View
            className={`h-full ${exercise.reached ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${percent}%` }}
          />
        </View>
        <Text
          testID={`skill-exercise-${exercise.exercise_id}-value`}
          className={`text-sm ${exercise.reached ? "font-semibold text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}
        >
          {formatSkillValue(exercise.counting_type, exercise.best)} / {formatSkillValue(exercise.counting_type, exercise.target_value)}
        </Text>
      </View>
      {exercise.last_done_date && (
        <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {t("skills.lastDone", { date: formatDate(parseISO(exercise.last_done_date)) })}
        </Text>
      )}
    </Pressable>
  );
}
