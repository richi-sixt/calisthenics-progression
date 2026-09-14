"use client";

import Link from "next/link";
import type { FollowUser } from "@/types";
import { useFollow, useUnfollow } from "@/hooks/use-social";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import Pagination from "@/components/ui/pagination";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

function ProfilePic({ imageFile, username }: { imageFile: string; username: string }) {
  const src = imageFile
    ? `${API_BASE}/static/profile_pics/${imageFile}`
    : null;

  return src ? (
    <img src={src} alt={username} className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-sm font-bold text-gray-500 dark:text-gray-400">
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function FollowUserRow({ user }: { user: FollowUser }) {
  const { t } = useTranslation();
  const follow = useFollow();
  const unfollow = useUnfollow();

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <Link href={`/users/${user.username}`} className="flex min-w-0 items-center gap-3">
        <ProfilePic imageFile={user.image_file} username={user.username} />
        <span className="truncate font-medium text-gray-900 dark:text-gray-100">
          @{user.username}
        </span>
      </Link>
      {user.is_following ? (
        <button
          onClick={() => unfollow.mutate(user.username)}
          disabled={unfollow.isPending}
          className="shrink-0 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          {unfollow.isPending ? t("social.unfollowing") : t("social.unfollow")}
        </button>
      ) : (
        <button
          onClick={() => follow.mutate(user.username)}
          disabled={follow.isPending}
          className="shrink-0 rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 disabled:opacity-50"
        >
          {follow.isPending ? t("social.following") : t("social.follow")}
        </button>
      )}
    </div>
  );
}

export default function FollowUserList({
  data,
  isLoading,
  error,
  onPageChange,
}: {
  data?: { data: FollowUser[]; meta: import("@/types").PaginationMeta };
  isLoading: boolean;
  error: unknown;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const users = data?.data ?? [];

  if (isLoading) return <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("followList.loading")}</p>;
  if (error) return <ErrorMessage error={error} />;
  if (users.length === 0) return <EmptyState title={t("followList.empty")} />;

  return (
    <div>
      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <FollowUserRow key={u.id} user={u} />
        ))}
      </div>
      {data?.meta && <Pagination meta={data.meta} onPageChange={onPageChange} />}
    </div>
  );
}
