import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTemplates } from "@/hooks/use-templates";
import { TemplateCard } from "@/components/template/TemplateCard";
import { CardListSkeleton, TemplateCardSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { Workout } from "@/types";

export default function TemplatesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isRefetching } = useTemplates();
  const templates = data?.data ?? [];

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("templates.title")}</Text>
        <Pressable onPress={() => router.push("/templates/new")} className="rounded-md bg-blue-600 px-4 py-2">
          <Text className="text-sm font-medium text-white">{t("templates.new")}</Text>
        </Pressable>
      </View>

      {isLoading && <CardListSkeleton count={3} Card={TemplateCardSkeleton} />}
      {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load templates.</Text>}
      {!isLoading && !error && templates.length === 0 && <Text className="mt-6 text-gray-500 dark:text-gray-400">{t("templates.empty")}</Text>}

      <FlatList
        className="mt-4 flex-1"
        data={templates}
        keyExtractor={(item: Workout) => String(item.id)}
        renderItem={({ item }) => <TemplateCard template={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />
    </View>
  );
}
