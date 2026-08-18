import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useCreateWorkout } from "@/hooks/use-workouts";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export default function NewWorkoutScreen() {
  const router = useRouter();
  const createWorkout = useCreateWorkout();

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      <WorkoutForm
        isPending={createWorkout.isPending}
        submitLabel="Create Workout"
        onSubmit={(data) => {
          createWorkout.mutate(data, { onSuccess: () => router.back() });
        }}
      />
    </ScrollView>
  );
}
