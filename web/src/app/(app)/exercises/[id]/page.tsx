"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  useExercise,
  useExerciseWorkouts,
  useDeleteExercise,
  useCopyExercise,
} from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import ReportBlockMenu from "@/components/social/report-block-menu";
import { Markdown } from "@/components/ui/markdown";

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const exerciseId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useExercise(exerciseId);
  const { data: profile } = useProfile();
  const { data: workoutsData } = useExerciseWorkouts(exerciseId);
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }
  if (error || !data) return <ErrorMessage error={error} />;

  const exercise = data.data;
  const isOwner = profile?.data?.id === exercise.user_id;

  return (
    <div>
      <Link href="/exercises" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.exercises").toLowerCase() })}
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">{exercise.title}</h1>
          <span className="mt-1 inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
            {exercise.counting_type}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOwner ? (
            <>
              <Link
                href={`/exercises/${exercise.id}/edit`}
                className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t("common.edit")}
              </Link>
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="rounded-md px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {t("exercises.archive")}
              </button>
            </>
          ) : (
            <button
              onClick={() => copyExercise.mutate(exerciseId)}
              disabled={copyExercise.isPending}
              className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              {copyExercise.isPending ? t("exercises.copying") : t("exercises.copyToMine")}
            </button>
          )}
          {!isOwner && exercise.username && (
            <ReportBlockMenu
              username={exercise.username}
              targetType="exercise"
              targetId={exercise.id}
              leaveOnBlock
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={() => {
          deleteExercise.mutate(exerciseId, {
            onSuccess: () => router.push("/exercises"),
          });
        }}
        title={t("exercises.archiveConfirmTitle")}
        message={t("exercises.archiveConfirmMessage")}
        confirmLabel={t("exercises.archive")}
        variant="danger"
      />

      {exercise.description && (
        <Markdown className="mt-4 text-gray-600 dark:text-gray-400">{exercise.description}</Markdown>
      )}

      {exercise.parents.length > 0 && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("exercises.partOf")}{" "}
          {exercise.parents.map((parent, i) => (
            <span key={parent.id}>
              {i > 0 && ", "}
              <Link href={`/exercises/${parent.id}`} className="text-blue-600 hover:text-blue-800">
                {parent.title}
              </Link>
            </span>
          ))}
        </p>
      )}

      {exercise.progressions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("exercises.progressionLevels")}</h2>
          <ol className="mt-2 space-y-1">
            {exercise.progressions.map((step, index) => (
              <li key={step.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                  {index + 1}
                </span>
                <Link href={`/exercises/${step.id}`} className="hover:text-blue-600">
                  {step.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t("exercises.recentWorkouts")}
        </h2>
        {workoutsData && workoutsData.data.length === 0 && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("exercises.neverUsed")}</p>
        )}
        <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
          {workoutsData?.data.map((w) => (
            <li key={w.id}>
              <Link
                href={`/workouts/${w.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">{w.title}</span>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {w.planned_date
                    ? new Date(`${w.planned_date}T00:00:00`).toLocaleDateString()
                    : t("exercises.noDate")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
