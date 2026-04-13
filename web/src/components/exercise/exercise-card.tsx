"use client";

import Link from "next/link";
import type { ExerciseDefinition } from "@/types";
import { useDeleteExercise, useCopyExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useCategories } from "@/hooks/use-categories";
import { useMemo } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export default function ExerciseCard({ exercise }: { exercise: ExerciseDefinition }) {
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();
  const { data: profile } = useProfile();
  const { data: catData } = useCategories();
  const isOwner = profile?.data?.id === exercise.user_id;

  // Map category_ids to names
  const categoryNames = useMemo(() => {
    const allCats = catData?.data ?? [];
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    return exercise.category_ids.map((id) => catMap.get(id)).filter(Boolean) as string[];
  }, [catData, exercise.category_ids]);

  const profilePicUrl = exercise.user_image_file
    ? `${API_BASE}/static/profile_pics/${exercise.user_image_file}`
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          {exercise.username && (
            <Link href={`/users/${exercise.username}`} className="flex-shrink-0">
              {profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt={exercise.username}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                  {exercise.username[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={`/exercises/${exercise.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600"
            >
              {exercise.title}
            </Link>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {exercise.username && (
                <Link
                  href={`/users/${exercise.username}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {exercise.username}
                </Link>
              )}
              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {exercise.counting_type}
              </span>
              {categoryNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600"
                >
                  {name}
                </span>
              ))}
            </div>
            {exercise.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                {exercise.description}
              </p>
            )}
            {exercise.progression_levels.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Progressions:{" "}
                {exercise.progression_levels
                  .sort((a, b) => a.level_order - b.level_order)
                  .map((l) => l.name)
                  .join(" → ")}
              </p>
            )}
          </div>
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
