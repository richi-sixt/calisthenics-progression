"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { Workout } from "@/types";
import { useToggleDone, useDeleteWorkout } from "@/hooks/use-workouts";

export default function WorkoutCard({ workout }: { workout: Workout }) {
  const toggleDone = useToggleDone();
  const deleteWorkout = useDeleteWorkout();

  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={`/workouts/${workout.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            {workout.title}
          </Link>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {workout.timestamp && (
              <time dateTime={workout.timestamp}>
                {format(new Date(workout.timestamp), "MMM d, yyyy 'at' HH:mm")}
              </time>
            )}
            <span>
              {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
            </span>
          </div>
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
