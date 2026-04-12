"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ExerciseForm from "@/components/exercise/exercise-form";
import { useCreateExercise } from "@/hooks/use-exercises";

export default function NewExercisePage() {
  const router = useRouter();
  const createExercise = useCreateExercise();

  return (
    <div>
      <Link href="/exercises" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to exercises
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New Exercise</h1>
      <div className="mt-6">
        <ExerciseForm
          isPending={createExercise.isPending}
          onSubmit={(data) => {
            createExercise.mutate(
              {
                ...data,
                progression_levels: data.progression_levels.map((p) => p.name),
              },
              { onSuccess: () => router.push("/exercises") }
            );
          }}
        />
      </div>
    </div>
  );
}
