import { View, Text, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import type { UserWithFollowing } from "@/types";
import { useFollow, useUnfollow } from "@/hooks/use-social";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export function UserProfileHeader({ user }: { user: UserWithFollowing }) {
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const follow = useFollow();
  const unfollow = useUnfollow();

  const profilePicUrl = user.image_file ? `${API_BASE}/static/profile_pics/${user.image_file}` : null;

  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center gap-4">
        {profilePicUrl ? (
          <Image source={{ uri: profilePicUrl }} className="h-16 w-16 rounded-full" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
            <Text className="text-xl font-bold text-gray-500 dark:text-gray-400">{user.username?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">@{user.username}</Text>
          {user.about_me && <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">{user.about_me}</Text>}
          <View className="mt-2 flex-row items-center gap-4">
            <Text className="text-sm text-gray-500 dark:text-gray-400"><Text className="font-bold text-gray-900 dark:text-gray-100">{user.follower_count}</Text> {t("profile.followers")}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400"><Text className="font-bold text-gray-900 dark:text-gray-100">{user.following_count}</Text> {t("profile.following")}</Text>
          </View>
          {user.last_seen && <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t("profile.lastSeen")} {formatDate(user.last_seen)}</Text>}
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {user.is_following ? (
          <Pressable onPress={() => unfollow.mutate(user.username)} disabled={unfollow.isPending} className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5">
            <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{unfollow.isPending ? t("social.unfollowing") : t("social.unfollow")}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => follow.mutate(user.username)} disabled={follow.isPending} className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5">
            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">{follow.isPending ? t("social.following") : t("social.follow")}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push({ pathname: "/messages/new", params: { to: user.username } })}
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("social.sendMessage")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
