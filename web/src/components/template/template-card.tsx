"use client";

import { useState } from "react";
import Link from "next/link";
import type { Workout, Exercise } from "@/types";
import { useDeleteTemplate, useUseTemplate } from "@/hooks/use-templates";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useTranslation, type TranslationKey } from "@/i18n";

function formatTemplateSets(exercise: Exercise, t: (key: TranslationKey) => string): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return t("workouts.noSets");

  const parts: string[] = [`${sets.length} ${sets.length === 1 ? t("workouts.set") : t("workouts.sets")}`];

  // Show individual set details like Flask does
  const setDetails = sets.map((s) => {
    if (s.reps != null && s.reps > 0) return `${s.reps} ${t("workouts.reps")}`;
    if (s.duration != null && s.duration > 0) {
      const mins = Math.floor(s.duration / 60);
      const secs = s.duration % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${s.duration}s`;
    }
    if (s.progression) return s.progression;
    return null;
  }).filter(Boolean);

  if (setDetails.length > 0) {
    parts.push(`( ${setDetails.join(", ")} )`);
  }

  return parts.join(" ");
}

export default function TemplateCard({ template }: { template: Workout }) {
  const { t } = useTranslation();
  const deleteTemplate = useDeleteTemplate();
  const useTemplate = useUseTemplate();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{template.title}</p>

        {/* Exercise detail list */}
        {template.exercises && template.exercises.length > 0 && (
          <div className="mt-2 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
            {template.exercises.map((ex, i) => (
              <p key={ex.id}>
                <span className="text-gray-400 dark:text-gray-500">{i + 1}.</span>{" "}
                <span className="font-medium">
                  {ex.exercise_definition_title ?? t("workouts.exercise")}
                </span>
                <span className="text-gray-400 dark:text-gray-500"> — </span>
                <span>{formatTemplateSets(ex, t)}</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              useTemplate.mutate(template.id, {
                onSuccess: (data) => router.push(`/workouts/${data.data.id}/edit`),
              })
            }
            disabled={useTemplate.isPending}
            className="rounded-md bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40"
          >
            {useTemplate.isPending ? t("templates.creating") : t("templates.startWorkout")}
          </button>
          <Link
            href={`/templates/${template.id}/edit`}
            className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t("common.edit")}
          </Link>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteTemplate.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteTemplate.mutate(template.id)}
        title={t("common.delete")}
        message={t("templates.deleteConfirmMessage")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
}
