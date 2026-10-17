import { ScrollView, View, ActivityIndicator, Text, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSkill, useDeleteSkill } from "@/hooks/use-skills";
import { SkillExerciseRow } from "@/components/skill/SkillExerciseRow";
import { useTranslation } from "@/i18n";

export default function SkillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const skillId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useSkill(skillId);
  const deleteSkill = useDeleteSkill();

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4"><Text className="text-red-600 dark:text-red-400">Failed to load skill.</Text></View>;
  }

  const skill = data.data;

  const confirmDelete = () => {
    Alert.alert(t("skills.deleteConfirmTitle"), t("skills.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => deleteSkill.mutate(skillId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{skill.title}</Text>
      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("skills.progress", { reached: skill.reached_count, total: skill.exercise_count })}
      </Text>

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          testID="skill-edit"
          onPress={() => router.push(`/skills/${skill.id}/edit`)}
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("common.edit")}</Text>
        </Pressable>
        <Pressable testID="skill-delete" onPress={confirmDelete} className="rounded-md px-3 py-1.5">
          <Text className="text-xs font-medium text-red-600 dark:text-red-400">{t("common.delete")}</Text>
        </Pressable>
      </View>

      {skill.description ? <Text className="mt-4 text-gray-600 dark:text-gray-400">{skill.description}</Text> : null}

      {skill.exercises.length === 0 ? (
        <Text className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("skills.noExercises")}</Text>
      ) : (
        <View className="mt-6 gap-3">
          {skill.exercises.map((exercise, index) => (
            <SkillExerciseRow
              key={exercise.exercise_id}
              exercise={exercise}
              index={index}
              isNext={exercise.exercise_id === skill.next_exercise_id}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
