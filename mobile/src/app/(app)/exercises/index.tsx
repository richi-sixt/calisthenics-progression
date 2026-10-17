import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, RefreshControl, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useExercises } from "@/hooks/use-exercises";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSkills } from "@/hooks/use-skills";
import { useFollowing } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import { useCategories } from "@/hooks/use-categories";
import GroupedCategoryChips from "@/components/exercise/GroupedCategoryChips";
import { ExerciseCard } from "@/components/exercise/ExerciseCard";
import { CardListSkeleton, ExerciseCardSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { ExerciseDefinition } from "@/types";

export default function ExercisesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState<"mine" | "following" | "all">("mine");
  const [username, setUsername] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: profile } = useProfile();
  const { data: followingData } = useFollowing(profile?.data?.username ?? "");
  const followingUsers = followingData?.data ?? [];
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [skillId, setSkillId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: skillsData } = useSkills();
  const skills = skillsData?.data ?? [];
  const { data, isLoading, error, refetch, isRefetching } = useExercises(
    page,
    userFilter,
    categoryIds,
    username || undefined,
    skillId ?? undefined,
    debouncedSearch
  );
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 p-4">
      <View className="flex-row items-center justify-between">
        <View />
        <Pressable onPress={() => router.push("/exercises/new")} className="rounded-md bg-blue-600 px-4 py-2">
          <Text className="text-sm font-medium text-white">{t("exercises.new")}</Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <View className="flex-row overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
          {(["mine", "following", "all"] as const).map((f) => {
            const active = userFilter === f && !username;
            return (
              <Pressable
                key={f}
                onPress={() => { setUserFilter(f); setUsername(""); setPage(1); }}
                testID={`exercises-scope-${f}`}
                className={`px-3 py-1.5 ${active ? "bg-blue-600" : "bg-transparent"}`}
              >
                <Text className={`text-xs font-medium ${active ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>
                  {t(`exercises.${f}` as const)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {followingUsers.length > 0 && (
          <Pressable
            onPress={() => setPickerOpen(true)}
            testID="exercises-user-filter"
            className={`flex-row items-center gap-1 rounded-md border px-3 py-1.5 ${username ? "border-blue-600" : "border-gray-300 dark:border-gray-600"}`}
          >
            <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {username ? `@${username}` : t("explore.filterByUser")}
            </Text>
            <Text className="text-gray-400 dark:text-gray-500">▾</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        testID="exercises-search"
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={t("workoutForm.searchExercisePlaceholder")}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        className="mt-3 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
      />

      {categories.length > 0 && (
        <View className="mt-3">
          <GroupedCategoryChips
            selectedIds={categoryIds}
            onChange={(ids) => {
              setCategoryIds(ids);
              setPage(1);
            }}
          />
        </View>
      )}

      {skills.length > 0 && (
        <View className="mt-3">
          <Text className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t("skills.filter")}</Text>
          <View className="flex-row flex-wrap gap-2">
            {skills.map((skill) => {
              const selected = skillId === skill.id;
              return (
                <Pressable
                  key={skill.id}
                  testID={`skill-filter-${skill.id}`}
                  onPress={() => {
                    setSkillId(selected ? null : skill.id);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 ${selected ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
                >
                  <Text className={`text-sm font-medium ${selected ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
                    {skill.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {isLoading && <CardListSkeleton count={3} Card={ExerciseCardSkeleton} />}
      {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load exercises.</Text>}
      {!isLoading && !error && exercises.length === 0 && <Text className="mt-6 text-gray-500 dark:text-gray-400">{t("exercises.empty")}</Text>}

      <FlatList
        className="mt-4 flex-1"
        data={exercises}
        keyExtractor={(item: ExerciseDefinition) => String(item.id)}
        renderItem={({ item }) => <ExerciseCard exercise={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      />

      {meta && (meta.has_prev || meta.has_next) && (
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={() => setPage((p) => p - 1)} disabled={!meta.has_prev} className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.previous")}</Text>
          </Pressable>
          <Text className="text-sm text-gray-500 dark:text-gray-400">{t("common.pageOf", { page: meta.page, total: Math.ceil(meta.total / meta.per_page) })}</Text>
          <Pressable onPress={() => setPage((p) => p + 1)} disabled={!meta.has_next} className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.next")}</Text>
          </Pressable>
        </View>
      )}
      <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerOpen(false)}>
        <View className="flex-1 bg-white dark:bg-gray-900 pt-4">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("explore.filterByUser")}</Text>
            <Pressable onPress={() => setPickerOpen(false)} testID="exercises-user-filter-close">
              <Text className="text-sm text-blue-600 dark:text-blue-400">{t("common.cancel")}</Text>
            </Pressable>
          </View>
          <FlatList
            data={followingUsers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setUsername(item.username);
                  setPage(1);
                  setPickerOpen(false);
                }}
                testID={`exercises-user-filter-option-${item.username}`}
                className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
              >
                <Text className="text-sm text-gray-900 dark:text-gray-100">@{item.username}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
