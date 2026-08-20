import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useCreateTemplate } from "@/hooks/use-templates";
import { WorkoutForm } from "@/components/workout/WorkoutForm";
import { useTranslation } from "@/i18n";

export default function NewTemplateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const createTemplate = useCreateTemplate();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <WorkoutForm
        isPending={createTemplate.isPending}
        submitLabel={t("templates.new")}
        onSubmit={(data) => createTemplate.mutate(data, { onSuccess: () => router.back() })}
      />
    </ScrollView>
  );
}
