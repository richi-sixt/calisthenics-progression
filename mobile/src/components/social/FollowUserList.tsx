import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import type { FollowUser, PaginatedResponse } from "@/types";
import { useFollow, useUnfollow } from "@/hooks/use-social";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

function FollowUserRow({ user }: { user: FollowUser }) {
  const router = useRouter();
  const { t } = useTranslation();
  const follow = useFollow();
  const unfollow = useUnfollow();
  const profilePicUrl = user.image_file ? `${API_BASE}/static/profile_pics/${user.image_file}` : null;

  return (
    <View className="flex-row items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <Pressable
        className="flex-1 flex-row items-center gap-3"
        onPress={() => router.push(`/users/${user.username}`)}
        testID={`follow-user-row-${user.id}`}
      >
        {profilePicUrl ? (
          <Image source={{ uri: profilePicUrl }} className="h-10 w-10 rounded-full" />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400">{user.username[0]?.toUpperCase() ?? "?"}</Text>
          </View>
        )}
        <Text className="flex-1 font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>
          @{user.username}
        </Text>
      </Pressable>
      {user.is_following ? (
        <Pressable
          onPress={() => unfollow.mutate(user.username)}
          disabled={unfollow.isPending}
          className="shrink-0 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {unfollow.isPending ? t("social.unfollowing") : t("social.unfollow")}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => follow.mutate(user.username)}
          disabled={follow.isPending}
          className="shrink-0 rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {follow.isPending ? t("social.following") : t("social.follow")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function FollowUserList({
  data,
  isLoading,
  error,
}: {
  data?: PaginatedResponse<FollowUser>;
  isLoading: boolean;
  error: unknown;
}) {
  const { t } = useTranslation();
  const users = data?.data ?? [];

  if (isLoading) {
    return <Text className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("followList.loading")}</Text>;
  }
  if (error) {
    return <Text className="mt-6 text-sm text-red-600 dark:text-red-400">Failed to load.</Text>;
  }
  if (users.length === 0) {
    return <Text className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("followList.empty")}</Text>;
  }

  return (
    <View className="mt-4 gap-2">
      {users.map((u) => (
        <FollowUserRow key={u.id} user={u} />
      ))}
    </View>
  );
}
