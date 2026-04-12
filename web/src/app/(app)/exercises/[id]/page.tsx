"use client";

import { use } from "react";
import Link from "next/link";
import { useExercise, useDeleteExercise, useCopyExercise } from "@/hooks/use-exercises";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const exerciseId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useExercise(exerciseId);
  const { data: profile } = useProfile();
  const deleteExercise = useDeleteExercise();
  const copyExercise = useCopyExercise();

  if (isLoading) return <Loading text="Loading exercise..." />;
  if (error || !data) return <ErrorMessage error={error} />;

  const exercise = data.data;
  const isOwner = profile?.data?.id === exercise.user_id;

  return (
    <div>
      <Link href="/exercises" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to exercises
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{exercise.title}</h1>
          <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {exercise.counting_type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              <Link
                href={`/exercises/${exercise.id}/edit`}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
              >
                Edit
              </Link>
              <button
                onClick={() => {
                  if (confirm("Archive this exercise?")) {
                    deleteExercise.mutate(exerciseId, {
                      onSuccess: () => router.push("/exercises"),
                    });
                  }
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Archive
              </button>
            </>
          ) : (
            <button
              onClick={() => copyExercise.mutate(exerciseId)}
              disabled={copyExercise.isPending}
              className="rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
            >
              {copyExercise.isPending ? "Copying..." : "Copy to My Exercises"}
            </button>
          )}
        </div>
      </div>

      {exercise.description && (
        <p className="mt-4 text-gray-600">{exercise.description}</p>
      )}

      {exercise.progression_levels.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">Progression Levels</h2>
          <ol className="mt-2 space-y-1">
            {exercise.progression_levels
              .sort((a, b) => a.level_order - b.level_order)
              .map((level) => (
                <li key={level.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium">
                    {level.level_order}
                  </span>
                  {level.name}
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
