import { View, Text, Pressable, ScrollView } from "react-native";
import { useBlockedUsers, useUnblockUser } from "@/hooks/use-moderation";
import { useTranslation } from "@/i18n";

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const { data } = useBlockedUsers();
  const unblock = useUnblockUser();
  const users = data?.data ?? [];

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      {users.length === 0 ? (
        <Text className="text-gray-500 dark:text-gray-400">{t("moderation.noBlocked")}</Text>
      ) : (
        users.map((u) => (
          <View
            key={u.id}
            className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <Text className="text-gray-900 dark:text-gray-100">@{u.username}</Text>
            <Pressable
              onPress={() => unblock.mutate(u.username)}
              disabled={unblock.isPending}
              className="rounded-md bg-gray-100 px-3 py-1.5 dark:bg-gray-700"
            >
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">{t("moderation.unblock")}</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
