import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import type { Workout, Exercise } from "@/types";
import { useDeleteTemplate, useUseTemplate } from "@/hooks/use-templates";

function formatTemplateSets(exercise: Exercise): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return "No sets";

  const parts: string[] = [`${sets.length} set${sets.length === 1 ? "" : "s"}`];
  const setDetails = sets
    .map((s) => {
      if (s.reps != null && s.reps > 0) return `${s.reps} reps`;
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
  const deleteTemplate = useDeleteTemplate();
  const useTemplate = useUseTemplate();

  const confirmDelete = () => {
    Alert.alert("Delete template", "Are you sure you want to delete this template?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTemplate.mutate(template.id) },
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
              <Text className="font-medium">{ex.exercise_definition_title ?? "Exercise"}</Text>
              <Text className="text-gray-400 dark:text-gray-500"> — </Text>
              {formatTemplateSets(ex)}
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
            {useTemplate.isPending ? "Creating..." : "Start workout"}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/templates/${template.id}/edit`)} className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">Edit</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleteTemplate.isPending} className="rounded-md px-3 py-1.5">
          <Text className="text-xs font-medium text-red-600 dark:text-red-400">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
