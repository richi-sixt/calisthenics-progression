import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useCatalogExercises, useImportCatalogExercise } from "@/hooks/use-catalog";
import { CardListSkeleton, ExerciseCardSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { CatalogExercise } from "@/types";

export default function CatalogScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch, isRefetching } = useCatalogExercises(page, search);
  const importExercise = useImportCatalogExercise();

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-4">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{t("catalog.intro")}</Text>
      <TextInput
        testID="catalog-search"
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={t("catalog.searchPlaceholder")}
        autoCapitalize="none"
        className="mt-3 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
      />

      {isLoading && <CardListSkeleton count={3} Card={ExerciseCardSkeleton} />}
      {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load exercises.</Text>}
      {!isLoading && !error && exercises.length === 0 && (
        <View className="mt-8 items-center">
          <Text className="text-lg font-medium text-gray-600 dark:text-gray-400">{t("catalog.empty")}</Text>
          <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">{t("catalog.emptyDescription")}</Text>
        </View>
      )}

      <FlatList
        className="mt-4 flex-1"
        data={exercises}
        keyExtractor={(item: CatalogExercise) => String(item.id)}
        ItemSeparatorComponent={() => <View className="h-3" />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListFooterComponent={
          meta && (meta.has_prev || meta.has_next) ? (
            <View className="mt-4 flex-row items-center justify-between">
              <Pressable disabled={!meta.has_prev} onPress={() => setPage(page - 1)} className={meta.has_prev ? "" : "opacity-30"}>
                <Text className="text-blue-600 dark:text-blue-400">{t("common.previous")}</Text>
              </Pressable>
              <Pressable disabled={!meta.has_next} onPress={() => setPage(page + 1)} className={meta.has_next ? "" : "opacity-30"}>
                <Text className="text-blue-600 dark:text-blue-400">{t("common.next")}</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            testID={`catalog-item-${item.id}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <Pressable onPress={() => router.push(`/exercises/${item.id}`)}>
              <Text className="font-medium text-gray-900 dark:text-gray-100">{item.title}</Text>
            </Pressable>
            {item.progressions.length > 0 && (
              <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t("exercises.progressions")} {item.progressions.map((p) => p.title).join(" → ")}
              </Text>
            )}
            <View className="mt-3 flex-row">
              {item.imported_exercise_id !== null ? (
                <Pressable
                  testID={`catalog-imported-${item.id}`}
                  onPress={() => router.push(`/exercises/${item.imported_exercise_id}`)}
                  className="rounded-md bg-green-50 dark:bg-green-900/20 px-3 py-1.5"
                >
                  <Text className="text-xs font-medium text-green-700 dark:text-green-400">✓ {t("catalog.imported")}</Text>
                </Pressable>
              ) : (
                <Pressable
                  testID={`catalog-import-${item.id}`}
                  onPress={() => importExercise.mutate(item.id)}
                  disabled={importExercise.isPending}
                  className="rounded-md bg-blue-600 px-3 py-1.5"
                >
                  <Text className="text-xs font-medium text-white">
                    {importExercise.isPending && importExercise.variables === item.id
                      ? t("catalog.importing")
                      : t("catalog.import")}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}
