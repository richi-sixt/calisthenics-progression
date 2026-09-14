import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import type { FollowUser, PaginatedResponse } from "@/types";
import { FollowButton } from "@/components/social/FollowButton";
import { useAcceptFollowRequest, useDenyFollowRequest, useRemoveFollower } from "@/hooks/use-social";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export type FollowUserListMode = "follow" | "requests" | "remove";

function RequestActions({ username }: { username: string }) {
  const { t } = useTranslation();
  const accept = useAcceptFollowRequest();
  const deny = useDenyFollowRequest();

  return (
    <View className="flex-row shrink-0 gap-2">
      <Pressable
        onPress={() => accept.mutate(username)}
        disabled={accept.isPending || deny.isPending}
        className="rounded-md bg-blue-600 px-3 py-1.5"
      >
        <Text className="text-xs font-medium text-white">
          {accept.isPending ? t("followRequests.accepting") : t("followRequests.accept")}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => deny.mutate(username)}
        disabled={accept.isPending || deny.isPending}
        className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5"
      >
        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {deny.isPending ? t("followRequests.denying") : t("followRequests.deny")}
        </Text>
      </Pressable>
    </View>
  );
}

function RemoveAction({ username }: { username: string }) {
  const { t } = useTranslation();
  const remove = useRemoveFollower();

  return (
    <Pressable
      onPress={() => remove.mutate(username)}
      disabled={remove.isPending}
      className="shrink-0 rounded-md px-3 py-1.5"
    >
      <Text className="text-xs font-medium text-red-600 dark:text-red-400">
        {remove.isPending ? t("social.removing") : t("social.removeFollower")}
      </Text>
    </Pressable>
  );
}

function FollowUserRow({ user, mode }: { user: FollowUser; mode: FollowUserListMode }) {
  const router = useRouter();
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
      {mode === "requests" ? (
        <RequestActions username={user.username} />
      ) : mode === "remove" ? (
        <RemoveAction username={user.username} />
      ) : (
        <FollowButton username={user.username} status={user.follow_status} size="sm" />
      )}
    </View>
  );
}

export function FollowUserList({
  data,
  isLoading,
  error,
  mode = "follow",
}: {
  data?: PaginatedResponse<FollowUser>;
  isLoading: boolean;
  error: unknown;
  mode?: FollowUserListMode;
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
    return (
      <Text className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        {mode === "requests" ? t("followRequests.empty") : t("followList.empty")}
      </Text>
    );
  }

  return (
    <View className="mt-4 gap-2">
      {users.map((u) => (
        <FollowUserRow key={u.id} user={u} mode={mode} />
      ))}
    </View>
  );
}
