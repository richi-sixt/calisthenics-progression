"use client";

import { useState } from "react";
import Link from "next/link";
import type { Workout } from "@/types";
import { useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useTranslation, type TranslationKey } from "@/i18n";

function formatSetSummary(exercise: import("@/types").Exercise, t: (key: TranslationKey) => string): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return t("workouts.noSets");

  const totalReps = sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalDuration = sets.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const parts: string[] = [`${sets.length} ${sets.length === 1 ? t("workouts.set") : t("workouts.sets")}`];

  if (totalReps > 0) {
    parts.push(`${totalReps} ${t("workouts.reps")}`);
  }
  if (totalDuration > 0) {
    const mins = Math.floor(totalDuration / 60);
    const secs = totalDuration % 60;
    parts.push(mins > 0 ? `${mins}m ${secs}s` : `${totalDuration}s`);
  }

  return parts.join(" · ");
}

export default function WorkoutCard({ workout }: { workout: Workout }) {
  const { t, formatDate } = useTranslation();
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/workouts/${workout.id}`}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600"
          >
            {workout.title}
          </Link>
          {workout.is_done ? (
            <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
              {t("workouts.done")}
            </span>
          ) : (
            <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
              {t("workouts.pendent")}
            </span>
          )}
        </div>
        {workout.timestamp && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatDate(workout.timestamp, "dateTime")}
          </p>
        )}

        {/* Exercise detail list */}
        {workout.exercises && workout.exercises.length > 0 && (
          <div className="mt-2 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
            {workout.exercises.map((ex, i) => (
              <p key={ex.id}>
                <span className="text-gray-400 dark:text-gray-500">{i + 1}.</span>{" "}
                <span className="font-medium">
                  {ex.exercise_definition_title ?? t("workouts.exercise")}
                </span>
                <span className="text-gray-400 dark:text-gray-500"> — </span>
                <span>{formatSetSummary(ex, t)}</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleDone.mutate(workout.id)}
            disabled={toggleDone.isPending}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              workout.is_done
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {workout.is_done ? t("workouts.done") : t("workouts.markDone")}
          </button>
          <Link
            href={`/workouts/${workout.id}/edit`}
            className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t("common.edit")}
          </Link>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteWorkout.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteWorkout.mutate(workout.id)}
        title={t("common.delete")}
        message={t("workouts.deleteConfirmMessage")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
}
