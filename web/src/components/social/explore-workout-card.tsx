"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { Workout } from "@/types";

export default function ExploreWorkoutCard({ workout }: { workout: Workout }) {
  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-gray-900">{workout.title}</p>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {workout.username && (
              <Link
                href={`/users/${workout.username}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                @{workout.username}
              </Link>
            )}
            {workout.timestamp && (
              <time dateTime={workout.timestamp}>
                {format(new Date(workout.timestamp), "MMM d, yyyy")}
              </time>
            )}
            <span>
              {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
            </span>
          </div>
          {workout.exercises && workout.exercises.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {workout.exercises
                .map((e) => e.exercise_definition_title)
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
        {workout.is_done && (
          <span className="ml-4 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Done
          </span>
        )}
      </div>
    </div>
  );
}
