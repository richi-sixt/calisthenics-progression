import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSkills } from "@/hooks/use-skills";
import { CardListSkeleton, CategorySkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import { markdownToPlainText } from "@/lib/markdown";
import type { Skill } from "@/types";

export default function SkillsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isRefetching } = useSkills();
  const skills = data?.data ?? [];

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-4">
      <Pressable
        testID="skills-new"
        onPress={() => router.push("/skills/new")}
        className="items-center rounded-md bg-blue-600 py-2.5"
      >
        <Text className="text-sm font-medium text-white">{t("skills.new")}</Text>
      </Pressable>

      {isLoading && <CardListSkeleton count={3} Card={CategorySkeleton} />}
      {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load skills.</Text>}
      {!isLoading && !error && skills.length === 0 && (
        <View className="mt-8 items-center">
          <Text className="text-lg font-medium text-gray-600 dark:text-gray-400">{t("skills.empty")}</Text>
          <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">{t("skills.emptyDescription")}</Text>
        </View>
      )}

      <FlatList
        className="mt-4 flex-1"
        data={skills}
        keyExtractor={(item: Skill) => String(item.id)}
        ItemSeparatorComponent={() => <View className="h-3" />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const complete = item.exercise_count > 0 && item.reached_count === item.exercise_count;
          return (
            <Pressable
              testID={`skill-card-${item.id}`}
              onPress={() => router.push(`/skills/${item.id}`)}
              className={`rounded-lg border px-4 py-3 ${
                complete
                  ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              }`}
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-medium text-gray-900 dark:text-gray-100">{item.title}</Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t("skills.progress", { reached: item.reached_count, total: item.exercise_count })}
                </Text>
              </View>
              {item.description ? (
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
                  {markdownToPlainText(item.description)}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
