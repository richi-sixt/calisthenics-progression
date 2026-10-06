"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExerciseDefinition } from "@/types";
import { useDeleteExercise, useCopyExercise, useUpdateExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useCategories } from "@/hooks/use-categories";
import { useMemo } from "react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import ReportBlockMenu from "@/components/social/report-block-menu";
import { useTranslation } from "@/i18n";
import { markdownToPlainText } from "@/lib/markdown-plain-text";
import { ownImageUrl } from "@/lib/uploaded-images";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export default function ExerciseCard({ exercise }: { exercise: ExerciseDefinition }) {
  const { t } = useTranslation();
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();
  const updateExercise = useUpdateExercise();
  const { data: profile } = useProfile();
  const { data: catData } = useCategories();
  const isOwner = profile?.data?.id === exercise.user_id;
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Map category_ids to names
  const descriptionPreview = useMemo(
    () => (exercise.description ? markdownToPlainText(exercise.description) : ""),
    [exercise.description]
  );
  const categoryNames = useMemo(() => {
    const allCats = catData?.data ?? [];
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    return exercise.category_ids.map((id) => catMap.get(id)).filter(Boolean) as string[];
  }, [catData, exercise.category_ids]);

  const profilePicUrl = exercise.user_image_file
    ? `${API_BASE}/static/profile_pics/${exercise.user_image_file}`
    : null;

  const thumbnailUrl = ownImageUrl(exercise.thumbnail_url);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex min-w-0 gap-3">
        {thumbnailUrl ? (
          <Link href={`/exercises/${exercise.id}`} className="flex-shrink-0">
            <img
              src={thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-16 w-16 rounded-md object-cover bg-gray-100 dark:bg-gray-700"
            />
          </Link>
        ) : (
          exercise.username && (
          <Link href={`/users/${exercise.username}`} className="flex-shrink-0">
            {profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt={exercise.username}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-sm font-bold text-gray-500 dark:text-gray-400">
                {exercise.username[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </Link>
          )
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/exercises/${exercise.id}`}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600"
          >
            {exercise.title}
          </Link>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {exercise.username && (
              <Link
                href={`/users/${exercise.username}`}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {thumbnailUrl && profilePicUrl && (
                  <img src={profilePicUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                )}
                {exercise.username}
              </Link>
            )}
            <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              {exercise.counting_type}
            </span>
            {(exercise.used_count ?? 0) > 0 && (
              <span
                title={t("exercises.usedTitle", { count: exercise.used_count ?? 0 })}
                className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400"
              >
                ✓ {t("exercises.used")}
              </span>
            )}
            {isOwner && (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  exercise.visibility === "public"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : exercise.visibility === "followers"
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {exercise.visibility === "public"
                  ? t("exercises.public")
                  : exercise.visibility === "followers"
                    ? t("exercises.followers")
                    : t("exercises.private")}
              </span>
            )}
            {categoryNames.map((name) => (
              <span
                key={name}
                className="inline-flex rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                {name}
              </span>
            ))}
          </div>
          {descriptionPreview && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {descriptionPreview}
            </p>
          )}
          {exercise.progressions.length > 0 && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t("exercises.progressions")} {exercise.progressions.map((p) => p.title).join(" → ")}
            </p>
          )}
          {exercise.parents.length > 0 && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t("exercises.partOf")} {exercise.parents.map((p) => p.title).join(", ")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isOwner ? (
              <>
                <Link
                  href={`/exercises/${exercise.id}/edit`}
                  className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t("common.edit")}
                </Link>
                <select
                  value={exercise.visibility}
                  onChange={(e) =>
                    updateExercise.mutate({ id: exercise.id, visibility: e.target.value })
                  }
                  disabled={updateExercise.isPending}
                  aria-label={t("exercises.visibility")}
                  className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <option value="public">{t("exercises.public")}</option>
                  <option value="followers">{t("exercises.followers")}</option>
                  <option value="private">{t("exercises.private")}</option>
                </select>
                <button
                  onClick={() => setShowArchiveDialog(true)}
                  disabled={deleteExercise.isPending}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {t("exercises.archive")}
                </button>
              </>
            ) : (
              <button
                onClick={() => copyExercise.mutate(exercise.id)}
                disabled={copyExercise.isPending}
                className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30"
              >
                {t("common.copy")}
              </button>
            )}
            {!isOwner && exercise.username && (
              <ReportBlockMenu
                username={exercise.username}
                targetType="exercise"
                targetId={exercise.id}
              />
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={() => deleteExercise.mutate(exercise.id)}
        title={t("exercises.archive")}
        message={t("exercises.archiveConfirmMessage")}
        confirmLabel={t("exercises.archive")}
        variant="danger"
      />
    </div>
  );
}
