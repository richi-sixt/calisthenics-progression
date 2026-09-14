import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useFollowRequests } from "@/hooks/use-social";
import { FollowUserList } from "@/components/social/FollowUserList";
import { useTranslation } from "@/i18n";

export default function FollowRequestsScreen() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFollowRequests(page);

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <FollowUserList data={data} isLoading={isLoading} error={error} mode="requests" />

      {data?.meta && (data.meta.has_prev || data.meta.has_next) && (
        <View className="mt-4 flex-row items-center justify-between">
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
    </ScrollView>
  );
}
