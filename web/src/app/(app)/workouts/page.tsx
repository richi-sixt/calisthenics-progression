"use client";

import { useState } from "react";
import { useWorkouts } from "@/hooks/use-workouts";
import WorkoutCard from "@/components/workout/workout-card";

export default function WorkoutsPage() {
  const [page, setPage] = useState(1);
  const [hideDone, setHideDone] = useState(false);
  const { data, isLoading, error } = useWorkouts(page, hideDone);

  const workouts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Workouts</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => {
              setHideDone(e.target.checked);
              setPage(1);
            }}
            className="rounded"
          />
          Hide completed
        </label>
      </div>

      {isLoading && (
        <p className="mt-6 text-gray-500">Loading workouts...</p>
      )}

      {error && (
        <div className="mt-6 text-red-600">
          <p>Failed to load workouts. Make sure the backend is running.</p>
          <p className="mt-1 text-sm text-red-400">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      )}

      {!isLoading && !error && workouts.length === 0 && (
        <p className="mt-6 text-gray-500">
          No workouts yet. Create your first workout to get started!
        </p>
      )}

      {workouts.length > 0 && (
        <div className="mt-4 space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}

      {meta && (meta.has_prev || meta.has_next) && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!meta.has_prev}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {meta.page} of {Math.ceil(meta.total / meta.per_page)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.has_next}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
