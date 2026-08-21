import { ScrollView, View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkout, useUpdateWorkout } from "@/hooks/use-workouts";
import { WorkoutForm } from "@/components/workout/WorkoutForm";
import { useTranslation } from "@/i18n";

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useWorkout(workoutId);
  const updateWorkout = useUpdateWorkout();

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

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <WorkoutForm
        defaultValues={data.data}
        isPending={updateWorkout.isPending}
        submitLabel={t("common.save")}
        onSubmit={(formData) => {
          updateWorkout.mutate({ id: workoutId, ...formData }, { onSuccess: () => router.back() });
        }}
      />
    </ScrollView>
  );
}
