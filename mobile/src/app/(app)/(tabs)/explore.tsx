import { useState } from "react";
import { View, Text, FlatList, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExplore } from "@/hooks/use-social";
import { ExploreWorkoutCard } from "@/components/social/ExploreWorkoutCard";
import { CardListSkeleton, ExploreCardSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { Workout } from "@/types";

export default function ExploreScreen() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch, isRefetching } = useExplore(page);
  const workouts = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <View className="flex-1 px-4">
        <Text className="py-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{t("explore.title")}</Text>

        {isLoading && <CardListSkeleton count={3} Card={ExploreCardSkeleton} />}
        {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load.</Text>}
        {!isLoading && !error && workouts.length === 0 && <Text className="mt-6 text-gray-500 dark:text-gray-400">{t("explore.empty")}</Text>}

        <FlatList
          className="flex-1"
          data={workouts}
          keyExtractor={(item: Workout) => String(item.id)}
          renderItem={({ item }) => <ExploreWorkoutCard workout={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 24 }}
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
    </SafeAreaView>
  );
}
