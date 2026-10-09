"use client";

import { useState } from "react";
import Link from "next/link";
import { useExercises } from "@/hooks/use-exercises";
import { useFollowing } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import ExerciseCard from "@/components/exercise/exercise-card";
import CategoryFilter from "@/components/exercise/category-filter";
import Pagination from "@/components/ui/pagination";
import PageHeader from "@/components/ui/page-header";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, ExerciseCardSkeleton } from "@/components/ui/skeleton";

export default function ExercisesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState<"mine" | "following" | "all">("mine");
  const [username, setUsername] = useState("");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const { data: profile } = useProfile();
  const { data: followingData } = useFollowing(profile?.data?.username ?? "");
  const followingUsers = followingData?.data ?? [];
  const { data, isLoading, error } = useExercises(
    page,
    userFilter,
    categoryIds,
    username || undefined
  );

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title={t("exercises.title")}>
        <Link
          href="/exercises/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("exercises.new")}
        </Link>
      </PageHeader>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md bg-gray-100 dark:bg-gray-700 p-0.5 text-sm">
          {(["mine", "following", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setUserFilter(s);
                setUsername("");
                setPage(1);
              }}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                userFilter === s && !username
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              {t(`exercises.${s}` as const)}
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
            <option value="">{t("explore.filterByUser")}</option>
            {followingUsers.map((u) => (
              <option key={u.id} value={u.username}>
                @{u.username}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-3">
        <CategoryFilter
          selectedIds={categoryIds}
          onChange={(ids) => { setCategoryIds(ids); setPage(1); }}
        />
      </div>

      {isLoading && <CardListSkeleton count={3} Card={ExerciseCardSkeleton} />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && exercises.length === 0 && (
        <EmptyState
          title={t("exercises.empty")}
          description={t("exercises.emptyDescription")}
        />
      )}

      {exercises.length > 0 && (
        <div className="mt-4 space-y-3">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      )}

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
