import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useCreateTemplate } from "@/hooks/use-templates";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export default function NewTemplateScreen() {
  const router = useRouter();
  const createTemplate = useCreateTemplate();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <WorkoutForm
        isPending={createTemplate.isPending}
        submitLabel="Create Template"
        onSubmit={(data) => createTemplate.mutate(data, { onSuccess: () => router.back() })}
      />
    </ScrollView>
  );
}
