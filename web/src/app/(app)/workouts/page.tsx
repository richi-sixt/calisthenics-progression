"use client";

import { useState } from "react";
import Link from "next/link";
import { useWorkouts } from "@/hooks/use-workouts";
import WorkoutCard from "@/components/workout/workout-card";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, WorkoutCardSkeleton } from "@/components/ui/skeleton";

export default function WorkoutsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [hideDone, setHideDone] = useState(false);
  const { data, isLoading, error } = useWorkouts(page, hideDone);

  const workouts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold dark:text-gray-100">{t("workouts.title")}</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => {
                setHideDone(e.target.checked);
                setPage(1);
              }}
              className="rounded"
            />
            {t("workouts.hideCompleted")}
          </label>
          <Link
            href="/workouts/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t("workouts.new")}
          </Link>
        </div>
      </div>

      {isLoading && (
        <CardListSkeleton count={3} Card={WorkoutCardSkeleton} />
      )}

      {error && (
        <div className="mt-6 text-red-600 dark:text-red-400">
          <p>{t("workouts.loadError")}</p>
          <p className="mt-1 text-sm text-red-400 dark:text-red-500">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      )}

      {!isLoading && !error && workouts.length === 0 && (
        <p className="mt-6 text-gray-500 dark:text-gray-400">
          {t("workouts.empty")}
        </p>
      )}

      {workouts.length > 0 && (
        <div className="mt-4 space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}

      {meta && (meta.has_prev || meta.has_next) && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!meta.has_prev}
            className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {t("common.previous")}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.pageOf", { page: meta.page, total: Math.ceil(meta.total / meta.per_page) })}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.has_next}
            className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {t("common.next")}
          </button>
        </div>
      )}
    </div>
  );
}
