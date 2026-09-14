"use client";

import { useState } from "react";
import { useExplore, useFollowing } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import ExploreWorkoutCard from "@/components/social/explore-workout-card";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, ExploreCardSkeleton } from "@/components/ui/skeleton";

export default function ExplorePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<"all" | "following">("all");
  const [username, setUsername] = useState("");

  const { data: profile } = useProfile();
  const { data: followingData } = useFollowing(profile?.data?.username ?? "");
  const followingUsers = followingData?.data ?? [];

  const { data, isLoading, error } = useExplore(page, {
    scope,
    username: username || undefined,
  });
  const workouts = data?.data ?? [];

  return (
    <div>
      <PageHeader title={t("explore.title")} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md bg-gray-100 dark:bg-gray-700 p-0.5 text-sm">
          {(["all", "following"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setScope(s);
                setPage(1);
              }}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                scope === s
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              {s === "all" ? t("explore.all") : t("explore.following")}
            </button>
          ))}
        </div>

        {followingUsers.length > 0 && (
          <select
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setPage(1);
            }}
            aria-label={t("explore.filterByUser")}
            className="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t("explore.allUsers")}</option>
            {followingUsers.map((u) => (
              <option key={u.id} value={u.username}>
                @{u.username}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading && <CardListSkeleton count={3} Card={ExploreCardSkeleton} />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && workouts.length === 0 && (
        <EmptyState
          title={t("explore.empty")}
          description={t("explore.emptyDescription")}
        />
      )}

      {workouts.length > 0 && (
        <div className="mt-4 space-y-3">
          {workouts.map((w) => (
            <ExploreWorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}

      {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
    </div>
  );
}
