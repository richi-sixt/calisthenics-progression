"use client";

import { use, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useWorkout, useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const workoutId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useWorkout(workoutId);
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return <p className="text-gray-500 dark:text-gray-400">{t("common.loading")}</p>;
  }

  if (error || !data) {
    return <p className="text-red-600 dark:text-red-400">{t("workouts.loadError")}</p>;
  }

  const workout = data.data;

  return (
    <div>
      <Link
        href="/workouts"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        &larr; {t("common.backTo", { page: t("nav.workouts").toLowerCase() })}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">{workout.title}</h1>
          {workout.timestamp && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(workout.timestamp), "dd.MM.yyyy, HH:mm")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/workouts/${workoutId}/edit`}
            className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t("common.edit")}
          </Link>
          <button
            onClick={() => toggleDone.mutate(workoutId)}
            disabled={toggleDone.isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              workout.is_done
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {workout.is_done ? t("workouts.completed") : t("workouts.markAsDone")}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteWorkout.isPending}
            className="rounded-md px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          deleteWorkout.mutate(workoutId, {
            onSuccess: () => router.push("/workouts"),
          });
        }}
        title={t("workouts.deleteConfirmTitle")}
        message={t("workouts.deleteConfirmMessage")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />

      {workout.exercises && workout.exercises.length > 0 ? (
        <div className="mt-6 space-y-4">
          {workout.exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {exercise.exercise_definition_title ?? `${t("workouts.exercise")} #${exercise.exercise_order}`}
              </h3>

              {exercise.sets && exercise.sets.length > 0 && (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                      <th className="pb-2 font-medium">{t("workouts.set")}</th>
                      <th className="pb-2 font-medium">{t("workouts.progression")}</th>
                      <th className="pb-2 font-medium">
                        {exercise.counting_type === "duration" ? t("workouts.duration") : t("workouts.reps")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.sets.map((set) => (
                      <tr key={set.id} className="border-b last:border-0 dark:border-gray-700">
                        <td className="py-2 text-gray-600 dark:text-gray-400">{set.set_order}</td>
                        <td className="py-2 dark:text-gray-300">{set.progression ?? "-"}</td>
                        <td className="py-2 dark:text-gray-300">
                          {exercise.counting_type === "duration"
                            ? set.duration_formatted || (set.duration ? `${set.duration}s` : "-")
                            : set.reps ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(!exercise.sets || exercise.sets.length === 0) && (
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">{t("workouts.noSetsRecorded")}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-gray-500 dark:text-gray-400">{t("workouts.noExercises")}</p>
      )}
    </div>
  );
}
