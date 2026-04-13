"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkout, useUpdateWorkout } from "@/hooks/use-workouts";
import WorkoutExerciseForm from "@/components/workout/workout-exercise-form";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";

export default function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const workoutId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useWorkout(workoutId);
  const updateWorkout = useUpdateWorkout();

  if (isLoading) return <Loading text={t("workouts.loading")} />;
  if (error || !data) return <ErrorMessage error={error} />;

  return (
    <div>
      <Link href="/workouts" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.workouts").toLowerCase() })}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t("workouts.editTitle")}</h1>
      <div className="mt-6">
        <WorkoutExerciseForm
          defaultValues={data.data}
          isPending={updateWorkout.isPending}
          submitLabel="Update Workout"
          onSubmit={(formData) => {
            updateWorkout.mutate(
              { id: workoutId, ...formData },
              { onSuccess: () => router.push("/workouts") }
            );
          }}
        />
      </div>
    </div>
  );
}
