import { ScrollView, View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSkill, useUpdateSkill } from "@/hooks/use-skills";
import { SkillForm } from "@/components/skill/SkillForm";

export default function EditSkillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const skillId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useSkill(skillId);
  const updateSkill = useUpdateSkill();

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4"><Text className="text-red-600 dark:text-red-400">Failed to load skill.</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <SkillForm
        defaultValues={data.data}
        isPending={updateSkill.isPending}
        error={updateSkill.error?.message}
        onSubmit={(body) => updateSkill.mutate({ id: skillId, ...body }, { onSuccess: () => router.back() })}
      />
    </ScrollView>
  );
}
