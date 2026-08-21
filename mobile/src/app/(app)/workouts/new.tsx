import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useCreateWorkout } from "@/hooks/use-workouts";
import { WorkoutForm } from "@/components/workout/WorkoutForm";
import { useTranslation } from "@/i18n";

export default function NewWorkoutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const createWorkout = useCreateWorkout();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <WorkoutForm
        isPending={createWorkout.isPending}
        submitLabel={t("workouts.new")}
        onSubmit={(data) => {
          createWorkout.mutate(data, { onSuccess: () => router.back() });
        }}
      />
    </ScrollView>
  );
}
