"use client";

import { useFollow, useUnfollow } from "@/hooks/use-social";
import { useTranslation } from "@/i18n";
import type { FollowStatus } from "@/types";

export default function FollowButton({
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
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-xs";

  if (status === "accepted") {
    return (
      <button
        onClick={() => unfollow.mutate(username)}
        disabled={unfollow.isPending}
        className={`rounded-md bg-gray-100 dark:bg-gray-700 ${padding} font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50`}
      >
        {unfollow.isPending ? t("social.unfollowing") : t("social.followingPill")}
      </button>
    );
  }

  if (status === "pending") {
    return (
      <button
        onClick={() => unfollow.mutate(username)}
        disabled={unfollow.isPending}
        className={`rounded-md bg-yellow-50 dark:bg-yellow-900/20 ${padding} font-medium text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-800/30 disabled:opacity-50`}
      >
        {unfollow.isPending ? t("social.cancelling") : t("social.requested")}
      </button>
    );
  }

  return (
    <button
      onClick={() => follow.mutate(username)}
      disabled={follow.isPending}
      className={`rounded-md bg-blue-50 dark:bg-blue-900/20 ${padding} font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 disabled:opacity-50`}
    >
      {follow.isPending ? t("social.following") : t("social.follow")}
    </button>
  );
}
