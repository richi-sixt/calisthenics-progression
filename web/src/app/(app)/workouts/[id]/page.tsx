"use client";

import { use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useWorkout, useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";
import { useRouter } from "next/navigation";

export default function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const workoutId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useWorkout(workoutId);
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();

  if (isLoading) {
    return <p className="text-gray-500">Loading workout...</p>;
  }

  if (error || !data) {
    return <p className="text-red-600">Failed to load workout.</p>;
  }

  const workout = data.data;

  return (
    <div>
      <Link
        href="/workouts"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to workouts
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workout.title}</h1>
          {workout.timestamp && (
            <p className="mt-1 text-sm text-gray-500">
              {format(new Date(workout.timestamp), "dd.MM.yyyy, HH:mm")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/workouts/${workoutId}/edit`}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            Edit
          </Link>
          <button
            onClick={() => toggleDone.mutate(workoutId)}
            disabled={toggleDone.isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              workout.is_done
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {workout.is_done ? "Completed" : "Mark as done"}
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this workout?")) {
                deleteWorkout.mutate(workoutId, {
                  onSuccess: () => router.push("/workouts"),
                });
              }
            }}
            disabled={deleteWorkout.isPending}
            className="rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {workout.exercises && workout.exercises.length > 0 ? (
        <div className="mt-6 space-y-4">
          {workout.exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <h3 className="font-semibold text-gray-900">
                {exercise.exercise_definition_title ?? `Exercise #${exercise.exercise_order}`}
              </h3>

              {exercise.sets && exercise.sets.length > 0 && (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Set</th>
                      <th className="pb-2 font-medium">Progression</th>
                      <th className="pb-2 font-medium">
                        {exercise.counting_type === "duration" ? "Duration" : "Reps"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.sets.map((set) => (
                      <tr key={set.id} className="border-b last:border-0">
                        <td className="py-2 text-gray-600">{set.set_order}</td>
                        <td className="py-2">{set.progression ?? "-"}</td>
                        <td className="py-2">
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
                <p className="mt-2 text-sm text-gray-400">No sets recorded</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-gray-500">No exercises in this workout.</p>
      )}
    </div>
  );
}
