import { useState } from "react";
import { View, Text, FlatList, RefreshControl, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExplore, useFollowing } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import { ExploreWorkoutCard } from "@/components/social/ExploreWorkoutCard";
import { CardListSkeleton, ExploreCardSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { Workout } from "@/types";

export default function ExploreScreen() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<"all" | "following">("all");
  const [filterUsername, setFilterUsername] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: profile } = useProfile();
  const { data: followingData } = useFollowing(profile?.data?.username ?? "");
  const followingUsers = followingData?.data ?? [];

  const { data, isLoading, error, refetch, isRefetching } = useExplore(page, {
    scope,
    username: filterUsername || undefined,
  });
  const workouts = data?.data ?? [];

  const setScopeAndReset = (s: "all" | "following") => {
    setScope(s);
    setPage(1);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <View className="flex-1 px-4">
        <Text className="py-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("explore.title")}</Text>

        <View className="flex-row flex-wrap items-center gap-2">
          <View className="flex-row overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
            {(["all", "following"] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setScopeAndReset(s)}
                testID={`explore-scope-${s}`}
                className={`px-3 py-1.5 ${scope === s ? "bg-blue-600" : "bg-transparent"}`}
              >
                <Text className={`text-xs font-medium ${scope === s ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>
                  {s === "all" ? t("explore.all") : t("explore.following")}
                </Text>
              </Pressable>
            ))}
          </View>

          {followingUsers.length > 0 && (
            <Pressable
              onPress={() => setPickerOpen(true)}
              testID="explore-user-filter"
              className="flex-row items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5"
            >
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {filterUsername ? `@${filterUsername}` : t("explore.allUsers")}
              </Text>
              <Text className="text-gray-400 dark:text-gray-500">▾</Text>
            </Pressable>
          )}
        </View>

        {isLoading && <CardListSkeleton count={3} Card={ExploreCardSkeleton} />}
        {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load.</Text>}
        {!isLoading && !error && workouts.length === 0 && <Text className="mt-6 text-gray-500 dark:text-gray-400">{t("explore.empty")}</Text>}

        <FlatList
          className="flex-1"
          data={workouts}
          keyExtractor={(item: Workout) => String(item.id)}
          renderItem={({ item }) => <ExploreWorkoutCard workout={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        />
      </View>
      {data?.meta && (data.meta.has_prev || data.meta.has_next) && (
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={() => setPage((p) => p - 1)} disabled={!data.meta.has_prev} className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.previous")}</Text>
          </Pressable>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.pageOf", { page: data.meta.page, total: Math.ceil(data.meta.total / data.meta.per_page) })}
          </Text>
          <Pressable onPress={() => setPage((p) => p + 1)} disabled={!data.meta.has_next} className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.next")}</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerOpen(false)}>
        <View className="flex-1 bg-white dark:bg-gray-900 pt-4">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("explore.filterByUser")}</Text>
            <Pressable onPress={() => setPickerOpen(false)} testID="explore-user-filter-close">
              <Text className="text-sm text-blue-600 dark:text-blue-400">{t("common.cancel")}</Text>
            </Pressable>
          </View>
          <FlatList
            data={[{ id: -1, username: "" }, ...followingUsers]}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setFilterUsername(item.username);
                  setPage(1);
                  setPickerOpen(false);
                }}
                testID={`explore-user-filter-option-${item.username || "all"}`}
                className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
              >
                <Text className="text-sm text-gray-900 dark:text-gray-100">
                  {item.username ? `@${item.username}` : t("explore.allUsers")}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
