import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, RefreshControl, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCatalogExercises,
  useImportCatalogExercise,
  useCatalogSkills,
  useImportCatalogSkill,
} from "@/hooks/use-catalog";
import { formatSkillValue } from "@/components/skill/format";
import { CardListSkeleton, ExerciseCardSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import { ownImageUrl } from "@/lib/uploaded-images";
import { markdownToPlainText } from "@/lib/markdown";
import type { CatalogExercise, CatalogSkill } from "@/types";

export default function CatalogScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  // The tab lives in the route params so the library rows can open either one.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const tab: "exercises" | "skills" = tabParam === "skills" ? "skills" : "exercises";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch, isRefetching } = useCatalogExercises(page, search);
  const importExercise = useImportCatalogExercise();
  const skillsQuery = useCatalogSkills(search);
  const importSkill = useImportCatalogSkill();
  const skills = skillsQuery.data?.data ?? [];

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-4">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{t("catalog.intro")}</Text>
      <View className="mt-3 flex-row self-start rounded-md bg-gray-100 dark:bg-gray-700 p-0.5">
        {(["exercises", "skills"] as const).map((key) => (
          <Pressable
            key={key}
            testID={`catalog-tab-${key}`}
            onPress={() => {
              router.setParams({ tab: key });
              setPage(1);
            }}
            className={`rounded px-3 py-1 ${tab === key ? "bg-white dark:bg-gray-800" : ""}`}
          >
            <Text className={`text-sm font-medium ${tab === key ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
              {key === "exercises" ? t("catalog.tabExercises") : t("catalog.tabSkills")}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        testID="catalog-search"
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={tab === "skills" ? t("catalog.searchSkills") : t("catalog.searchPlaceholder")}
        autoCapitalize="none"
        className="mt-3 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
      />

      {tab === "exercises" && isLoading && <CardListSkeleton count={3} Card={ExerciseCardSkeleton} />}
      {tab === "exercises" && error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load exercises.</Text>}
      {tab === "exercises" && !isLoading && !error && exercises.length === 0 && (
        <View className="mt-8 items-center">
          <Text className="text-lg font-medium text-gray-600 dark:text-gray-400">{t("catalog.empty")}</Text>
          <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">{t("catalog.emptyDescription")}</Text>
        </View>
      )}

      {tab === "skills" && (
        <FlatList
          className="mt-4 flex-1"
          data={skills}
          keyExtractor={(item: CatalogSkill) => String(item.id)}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            skills.length > 0 ? (
              <Text className="mb-2 text-xs text-gray-400 dark:text-gray-500">{t("catalog.skillImportHint")}</Text>
            ) : null
          }
          ListEmptyComponent={
            skillsQuery.isLoading ? null : (
              <Text className="mt-8 text-center text-gray-500 dark:text-gray-400">{t("catalog.skillsEmpty")}</Text>
            )
          }
          renderItem={({ item }) => (
            <View
              testID={`catalog-skill-${item.id}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <Text className="font-medium text-gray-900 dark:text-gray-100">{item.title}</Text>
              {item.description ? (
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
                  {markdownToPlainText(item.description)}
                </Text>
              ) : null}
              <View className="mt-2 gap-0.5">
                {item.exercises.map((e, i) => {
                  const thumb = ownImageUrl(e.thumbnail_url);
                  return (
                    <View key={e.exercise_id} className="flex-row items-center gap-2">
                      {thumb ? (
                        <Image
                          source={{ uri: thumb }}
                          testID={`catalog-skill-thumbnail-${item.id}-${e.exercise_id}`}
                          className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-700"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-700" />
                      )}
                      <Text className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                        {i + 1}. {e.title} ({formatSkillValue(e.counting_type, e.target_value)})
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View className="mt-3 flex-row">
                {item.imported_skill_id !== null ? (
                  <Pressable
                    testID={`catalog-skill-imported-${item.id}`}
                    onPress={() => router.push(`/skills/${item.imported_skill_id}`)}
                    className="rounded-md bg-green-50 dark:bg-green-900/20 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-green-700 dark:text-green-400">✓ {t("catalog.skillImported")}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    testID={`catalog-skill-import-${item.id}`}
                    onPress={() => importSkill.mutate(item.id)}
                    disabled={importSkill.isPending}
                    className="rounded-md bg-blue-600 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-white">
                      {importSkill.isPending && importSkill.variables === item.id
                        ? t("catalog.importing")
                        : t("catalog.importSkill")}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}

      {tab === "exercises" && (
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
            <View className="flex-row gap-3">
              {ownImageUrl(item.thumbnail_url) ? (
                <Pressable onPress={() => router.push(`/exercises/${item.id}`)}>
                  <Image
                    source={{ uri: ownImageUrl(item.thumbnail_url)! }}
                    testID={`catalog-thumbnail-${item.id}`}
                    className="h-16 w-16 rounded-md bg-gray-100 dark:bg-gray-700"
                    resizeMode="cover"
                  />
                </Pressable>
              ) : null}
              <View className="min-w-0 flex-1">
                <Pressable onPress={() => router.push(`/exercises/${item.id}`)}>
                  <Text className="font-medium text-gray-900 dark:text-gray-100">{item.title}</Text>
                </Pressable>
                {item.progressions.length > 0 && (
                  <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {t("exercises.progressions")} {item.progressions.map((p) => p.title).join(" → ")}
                  </Text>
                )}
              </View>
            </View>
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
      )}
    </View>
  );
}
