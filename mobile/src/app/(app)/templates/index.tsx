import { View, Text, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useTemplates } from "@/hooks/use-templates";
import { TemplateCard } from "@/components/template/TemplateCard";
import type { Workout } from "@/types";

export default function TemplatesScreen() {
  const router = useRouter();
  const { data, isLoading, error } = useTemplates();
  const templates = data?.data ?? [];

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold">Templates</Text>
        <Pressable onPress={() => router.push("/templates/new")} className="rounded-md bg-blue-600 px-4 py-2">
          <Text className="text-sm font-medium text-white">New</Text>
        </Pressable>
      </View>

      {isLoading && <ActivityIndicator className="mt-6" />}
      {error && <Text className="mt-6 text-red-600">Failed to load templates.</Text>}
      {!isLoading && !error && templates.length === 0 && <Text className="mt-6 text-gray-500">No templates yet.</Text>}

      <FlatList
        className="mt-4 flex-1"
        data={templates}
        keyExtractor={(item: Workout) => String(item.id)}
        renderItem={({ item }) => <TemplateCard template={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
