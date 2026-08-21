import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import type { Workout, Exercise } from "@/types";
import { useDeleteTemplate, useUseTemplate } from "@/hooks/use-templates";
import { useTranslation, type TranslationKey } from "@/i18n";

function formatTemplateSets(exercise: Exercise, t: (key: TranslationKey) => string): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return t("workouts.noSets");

  const parts: string[] = [`${sets.length} ${sets.length === 1 ? t("workouts.set") : t("workouts.sets")}`];
  const setDetails = sets
    .map((s) => {
      if (s.reps != null && s.reps > 0) return `${s.reps} ${t("workouts.reps")}`;
      if (s.duration != null && s.duration > 0) {
        const mins = Math.floor(s.duration / 60);
        const secs = s.duration % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${s.duration}s`;
      }
      if (s.progression) return s.progression;
      return null;
    })
    .filter(Boolean);

  if (setDetails.length > 0) parts.push(`( ${setDetails.join(", ")} )`);
  return parts.join(" ");
}

export function TemplateCard({ template }: { template: Workout }) {
  const router = useRouter();
  const { t } = useTranslation();
  const deleteTemplate = useDeleteTemplate();
  const useTemplate = useUseTemplate();

  const confirmDelete = () => {
    Alert.alert(t("templates.deleteConfirmTitle"), t("templates.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteTemplate.mutate(template.id) },
    ]);
  };

  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{template.title}</Text>

      {template.exercises && template.exercises.length > 0 && (
        <View className="mt-2 gap-0.5">
          {template.exercises.map((ex, i) => (
            <Text key={ex.id} className="text-sm text-gray-600 dark:text-gray-400">
              <Text className="text-gray-400 dark:text-gray-500">{i + 1}. </Text>
              <Text className="font-medium">{ex.exercise_definition_title ?? t("workouts.exercise")}</Text>
              <Text className="text-gray-400 dark:text-gray-500"> — </Text>
              {formatTemplateSets(ex, t)}
            </Text>
          ))}
        </View>
      )}

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() =>
            useTemplate.mutate(template.id, {
              onSuccess: (data) => router.push(`/workouts/${data.data.id}/edit`),
            })
          }
          disabled={useTemplate.isPending}
          className="rounded-md bg-green-100 dark:bg-green-900/30 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-green-700 dark:text-green-400">
            {useTemplate.isPending ? t("templates.creating") : t("templates.startWorkout")}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/templates/${template.id}/edit`)} className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("common.edit")}</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleteTemplate.isPending} className="rounded-md px-3 py-1.5">
          <Text className="text-xs font-medium text-red-600 dark:text-red-400">{t("common.delete")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
