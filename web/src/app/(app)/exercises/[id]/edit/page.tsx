"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useExercise, useUpdateExercise } from "@/hooks/use-exercises";
import ExerciseForm from "@/components/exercise/exercise-form";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";

export default function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const exerciseId = Number(id);
  const router = useRouter();
  const { data, isLoading, error } = useExercise(exerciseId);
  const updateExercise = useUpdateExercise();

  if (isLoading) return <Loading text="Loading exercise..." />;
  if (error || !data) return <ErrorMessage error={error} />;

  const exercise = data.data;

  return (
    <div>
      <Link href={`/exercises/${exerciseId}`} className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to exercise
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Edit Exercise</h1>
      <div className="mt-6">
        <ExerciseForm
          defaultValues={exercise}
          isPending={updateExercise.isPending}
          onSubmit={(data) => {
            updateExercise.mutate(
              {
                id: exerciseId,
                ...data,
                progression_levels: data.progression_levels.map((p, i) => ({
                  name: p.name,
                  level_order: i + 1,
                })),
              },
              { onSuccess: () => router.push(`/exercises/${exerciseId}`) }
            );
          }}
        />
      </div>
    </div>
  );
}
