import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useExercises } from "@/hooks/use-exercises";
import { useCategories } from "@/hooks/use-categories";
import { ExerciseCard } from "@/components/exercise/ExerciseCard";
import type { ExerciseDefinition } from "@/types";

export default function ExercisesScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState<"mine" | "all">("mine");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const { data, isLoading, error } = useExercises(page, userFilter, categoryIds);
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  const toggleCategory = (id: number) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    setPage(1);
  };

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-2">
          <Pressable onPress={() => { setUserFilter("mine"); setPage(1); }} className={`rounded-md px-3 py-1.5 ${userFilter === "mine" ? "bg-gray-900" : "bg-gray-100"}`}>
            <Text className={`text-sm font-medium ${userFilter === "mine" ? "text-white" : "text-gray-600"}`}>Mine</Text>
          </Pressable>
          <Pressable onPress={() => { setUserFilter("all"); setPage(1); }} className={`rounded-md px-3 py-1.5 ${userFilter === "all" ? "bg-gray-900" : "bg-gray-100"}`}>
            <Text className={`text-sm font-medium ${userFilter === "all" ? "text-white" : "text-gray-600"}`}>All</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push("/exercises/new")} className="rounded-md bg-blue-600 px-4 py-2">
          <Text className="text-sm font-medium text-white">New</Text>
        </Pressable>
      </View>

      {categories.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {categories.map((cat) => (
            <Pressable key={cat.id} onPress={() => toggleCategory(cat.id)} className={`rounded-full px-3 py-1 ${categoryIds.includes(cat.id) ? "bg-blue-100" : "bg-gray-100"}`}>
              <Text className={`text-sm font-medium ${categoryIds.includes(cat.id) ? "text-blue-700" : "text-gray-600"}`}>{cat.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading && <ActivityIndicator className="mt-6" />}
      {error && <Text className="mt-6 text-red-600">Failed to load exercises.</Text>}
      {!isLoading && !error && exercises.length === 0 && <Text className="mt-6 text-gray-500">No exercises yet.</Text>}

      <FlatList
        className="mt-4 flex-1"
        data={exercises}
        keyExtractor={(item: ExerciseDefinition) => String(item.id)}
        renderItem={({ item }) => <ExerciseCard exercise={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {meta && (meta.has_prev || meta.has_next) && (
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={() => setPage((p) => p - 1)} disabled={!meta.has_prev} className="rounded-md bg-gray-100 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700">Previous</Text>
          </Pressable>
          <Text className="text-sm text-gray-500">Page {meta.page} of {Math.ceil(meta.total / meta.per_page)}</Text>
          <Pressable onPress={() => setPage((p) => p + 1)} disabled={!meta.has_next} className="rounded-md bg-gray-100 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700">Next</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
