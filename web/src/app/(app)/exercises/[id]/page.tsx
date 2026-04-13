"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useExercise, useDeleteExercise, useCopyExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";
import ConfirmDialog from "@/components/ui/confirm-dialog";

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

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">{exercise.title}</h1>
          <span className="mt-1 inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
            {exercise.counting_type}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
        <p className="mt-4 text-gray-600 dark:text-gray-400">{exercise.description}</p>
      )}

      {exercise.progression_levels.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("exercises.progressionLevels")}</h2>
          <ol className="mt-2 space-y-1">
            {exercise.progression_levels
              .sort((a, b) => a.level_order - b.level_order)
              .map((level) => (
                <li key={level.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                    {level.level_order}
                  </span>
                  {level.name}
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
