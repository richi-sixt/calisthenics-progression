import { View, Text, Pressable, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTemplates } from "@/hooks/use-templates";
import { TemplateCard } from "@/components/template/TemplateCard";
import type { Workout } from "@/types";

export default function TemplatesScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useTemplates();
  const templates = data?.data ?? [];

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Templates</Text>
        <Pressable onPress={() => router.push("/templates/new")} className="rounded-md bg-blue-600 px-4 py-2">
          <Text className="text-sm font-medium text-white">New</Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator className="mt-6" />}
      {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load templates.</Text>}
      {!isLoading && !error && templates.length === 0 && <Text className="mt-6 text-gray-500 dark:text-gray-400">No templates yet.</Text>}

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
