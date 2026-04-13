"use client";

import Link from "next/link";
import type { UserWithFollowing } from "@/types";
import { useFollow, useUnfollow } from "@/hooks/use-social";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export default function UserProfileHeader({ user }: { user: UserWithFollowing }) {
  const { t, formatDate } = useTranslation();
  const follow = useFollow();
  const unfollow = useUnfollow();

  const profilePicUrl = user.image_file
    ? `${API_BASE}/static/profile_pics/${user.image_file}`
    : null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center gap-4">
        {profilePicUrl ? (
          <img
            src={profilePicUrl}
            alt={user.username}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-xl font-bold text-gray-500 dark:text-gray-400">
            {user.username?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">@{user.username}</h1>
          {user.about_me && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{user.about_me}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>
              <strong className="text-gray-900 dark:text-gray-100">{user.follower_count}</strong>{" "}
              {t("profile.followers")}
            </span>
            <span>
              <strong className="text-gray-900 dark:text-gray-100">{user.following_count}</strong>{" "}
              {t("profile.following")}
            </span>
          </div>
          {user.last_seen && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t("profile.lastSeen")} {formatDate(user.last_seen)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {user.is_following ? (
          <button
            onClick={() => unfollow.mutate(user.username)}
            disabled={unfollow.isPending}
            className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {unfollow.isPending ? t("social.unfollowing") : t("social.unfollow")}
          </button>
        ) : (
          <button
            onClick={() => follow.mutate(user.username)}
            disabled={follow.isPending}
            className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 disabled:opacity-50"
          >
            {follow.isPending ? t("social.following") : t("social.follow")}
          </button>
        )}
        <Link
          href={`/messages/new?to=${user.username}`}
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {t("social.sendMessage")}
        </Link>
      </div>
    </div>
  );
}
