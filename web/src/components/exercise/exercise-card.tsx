"use client";

import Link from "next/link";
import type { ExerciseDefinition } from "@/types";
import { useDeleteExercise, useCopyExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";

export default function ExerciseCard({ exercise }: { exercise: ExerciseDefinition }) {
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();
  const { data: profile } = useProfile();
  const isOwner = profile?.data?.id === exercise.user_id;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={`/exercises/${exercise.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            {exercise.title}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {exercise.counting_type}
            </span>
            {exercise.progression_levels.length > 0 && (
              <span className="text-xs text-gray-400">
                {exercise.progression_levels.length} levels
              </span>
            )}
          </div>
          {exercise.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {exercise.description}
            </p>
          )}
        </div>
        <div className="ml-4 flex items-center gap-2">
          {isOwner ? (
            <>
              <Link
                href={`/exercises/${exercise.id}/edit`}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                Edit
              </Link>
              <button
                onClick={() => {
                  if (confirm("Archive this exercise?")) deleteExercise.mutate(exercise.id);
                }}
                disabled={deleteExercise.isPending}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Archive
              </button>
            </>
          ) : (
            <button
              onClick={() => copyExercise.mutate(exercise.id)}
              disabled={copyExercise.isPending}
              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
            >
              Copy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
