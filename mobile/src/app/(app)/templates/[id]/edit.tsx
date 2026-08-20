import { ScrollView, View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkout } from "@/hooks/use-workouts";
import { useUpdateTemplate } from "@/hooks/use-templates";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useWorkout(templateId);
  const updateTemplate = useUpdateTemplate();

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4"><Text className="text-red-600 dark:text-red-400">Failed to load template.</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <WorkoutForm
        defaultValues={data.data}
        isPending={updateTemplate.isPending}
        submitLabel="Update Template"
        onSubmit={(formData) => updateTemplate.mutate({ id: templateId, ...formData }, { onSuccess: () => router.back() })}
      />
    </ScrollView>
  );
}
