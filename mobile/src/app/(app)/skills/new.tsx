import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useCreateSkill } from "@/hooks/use-skills";
import { SkillForm } from "@/components/skill/SkillForm";

export default function NewSkillScreen() {
  const router = useRouter();
  const createSkill = useCreateSkill();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <SkillForm
        isPending={createSkill.isPending}
        error={createSkill.error?.message}
        onSubmit={(data) => createSkill.mutate(data, { onSuccess: (res) => router.replace(`/skills/${res.data.id}`) })}
      />
    </ScrollView>
  );
}
