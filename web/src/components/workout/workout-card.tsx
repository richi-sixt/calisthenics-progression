"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { Workout } from "@/types";
import { useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";

function formatSetSummary(exercise: import("@/types").Exercise): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return "No sets";

  const totalReps = sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalDuration = sets.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const parts: string[] = [`${sets.length} ${sets.length === 1 ? "Set" : "Sets"}`];

  if (totalReps > 0) {
    parts.push(`${totalReps} Reps`);
  }
  if (totalDuration > 0) {
    const mins = Math.floor(totalDuration / 60);
    const secs = totalDuration % 60;
    parts.push(mins > 0 ? `${mins}m ${secs}s` : `${totalDuration}s`);
  }

  return parts.join(" · ");
}

export default function WorkoutCard({ workout }: { workout: Workout }) {
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/workouts/${workout.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600"
            >
              {workout.title}
            </Link>
            {workout.is_done ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                done
              </span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                pendent
              </span>
            )}
          </div>
          {workout.timestamp && (
            <p className="mt-1 text-sm text-gray-500">
              {format(new Date(workout.timestamp), "dd.MM.yyyy, HH:mm")}
            </p>
          )}

          {/* Exercise detail list */}
          {workout.exercises && workout.exercises.length > 0 && (
            <div className="mt-2 space-y-0.5 text-sm text-gray-600">
              {workout.exercises.map((ex, i) => (
                <p key={ex.id}>
                  <span className="text-gray-400">{i + 1}.</span>{" "}
                  <span className="font-medium">
                    {ex.exercise_definition_title ?? "Exercise"}
                  </span>
                  <span className="text-gray-400"> — </span>
                  <span>{formatSetSummary(ex)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="ml-4 flex items-center gap-2">
          <button
            onClick={() => toggleDone.mutate(workout.id)}
            disabled={toggleDone.isPending}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              workout.is_done
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {workout.is_done ? "Done" : "Mark done"}
          </button>
          <Link
            href={`/workouts/${workout.id}/edit`}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            Edit
          </Link>
          <button
            onClick={() => {
              if (confirm("Delete this workout?")) {
                deleteWorkout.mutate(workout.id);
              }
            }}
            disabled={deleteWorkout.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
