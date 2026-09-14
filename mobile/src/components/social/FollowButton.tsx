import { Text, Pressable } from "react-native";
import { useFollow, useUnfollow } from "@/hooks/use-social";
import { useTranslation } from "@/i18n";
import type { FollowStatus } from "@/types";

export function FollowButton({
  username,
  status,
  size = "md",
}: {
  username: string;
  status: FollowStatus;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();
  const follow = useFollow();
  const unfollow = useUnfollow();
  const padding = size === "sm" ? "px-2 py-0.5" : "px-3 py-1.5";

  if (status === "accepted") {
    return (
      <Pressable
        onPress={() => unfollow.mutate(username)}
        disabled={unfollow.isPending}
        className={`shrink-0 rounded-md bg-gray-100 dark:bg-gray-700 ${padding}`}
      >
        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {unfollow.isPending ? t("social.unfollowing") : t("social.followingPill")}
        </Text>
      </Pressable>
    );
  }

  if (status === "pending") {
    return (
      <Pressable
        onPress={() => unfollow.mutate(username)}
        disabled={unfollow.isPending}
        className={`shrink-0 rounded-md bg-yellow-50 dark:bg-yellow-900/20 ${padding}`}
      >
        <Text className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
          {unfollow.isPending ? t("social.cancelling") : t("social.requested")}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => follow.mutate(username)}
      disabled={follow.isPending}
      className={`shrink-0 rounded-md bg-blue-50 dark:bg-blue-900/20 ${padding}`}
    >
      <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
        {follow.isPending ? t("social.following") : t("social.follow")}
      </Text>
    </Pressable>
  );
}
