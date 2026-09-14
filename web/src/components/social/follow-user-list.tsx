"use client";

import Link from "next/link";
import type { FollowUser } from "@/types";
import FollowButton from "@/components/social/follow-button";
import { useAcceptFollowRequest, useDenyFollowRequest, useRemoveFollower } from "@/hooks/use-social";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import Pagination from "@/components/ui/pagination";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export type FollowUserListMode = "follow" | "requests" | "remove";

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

function RequestActions({ username }: { username: string }) {
  const { t } = useTranslation();
  const accept = useAcceptFollowRequest();
  const deny = useDenyFollowRequest();

  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={() => accept.mutate(username)}
        disabled={accept.isPending || deny.isPending}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {accept.isPending ? t("followRequests.accepting") : t("followRequests.accept")}
      </button>
      <button
        onClick={() => deny.mutate(username)}
        disabled={accept.isPending || deny.isPending}
        className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
      >
        {deny.isPending ? t("followRequests.denying") : t("followRequests.deny")}
      </button>
    </div>
  );
}

function RemoveAction({ username }: { username: string }) {
  const { t } = useTranslation();
  const remove = useRemoveFollower();

  return (
    <button
      onClick={() => remove.mutate(username)}
      disabled={remove.isPending}
      className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
    >
      {remove.isPending ? t("social.removing") : t("social.removeFollower")}
    </button>
  );
}

function FollowUserRow({ user, mode }: { user: FollowUser; mode: FollowUserListMode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <Link href={`/users/${user.username}`} className="flex min-w-0 items-center gap-3">
        <ProfilePic imageFile={user.image_file} username={user.username} />
        <span className="truncate font-medium text-gray-900 dark:text-gray-100">
          @{user.username}
        </span>
      </Link>
      {mode === "requests" ? (
        <RequestActions username={user.username} />
      ) : mode === "remove" ? (
        <RemoveAction username={user.username} />
      ) : (
        <FollowButton username={user.username} status={user.follow_status} size="sm" />
      )}
    </div>
  );
}

export default function FollowUserList({
  data,
  isLoading,
  error,
  onPageChange,
  mode = "follow",
}: {
  data?: { data: FollowUser[]; meta: import("@/types").PaginationMeta };
  isLoading: boolean;
  error: unknown;
  onPageChange: (page: number) => void;
  mode?: FollowUserListMode;
}) {
  const { t } = useTranslation();
  const users = data?.data ?? [];

  if (isLoading) return <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("followList.loading")}</p>;
  if (error) return <ErrorMessage error={error} />;
  if (users.length === 0) {
    return (
      <EmptyState
        title={mode === "requests" ? t("followRequests.empty") : t("followList.empty")}
      />
    );
  }

  return (
    <div>
      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <FollowUserRow key={u.id} user={u} mode={mode} />
        ))}
      </div>
      {data?.meta && <Pagination meta={data.meta} onPageChange={onPageChange} />}
    </div>
  );
}
