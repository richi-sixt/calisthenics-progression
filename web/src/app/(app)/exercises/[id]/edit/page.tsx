"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useExercise, useUpdateExercise } from "@/hooks/use-exercises";
import ExerciseForm from "@/components/exercise/exercise-form";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";

export default function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const exerciseId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useExercise(exerciseId);
  const updateExercise = useUpdateExercise();

  if (isLoading) return <Loading text={t("exercises.loadingOne")} />;
  if (error || !data) return <ErrorMessage error={error} />;

  const exercise = data.data;

  return (
    <div>
      <Link href={`/exercises/${exerciseId}`} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.exercises").toLowerCase() })}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t("exercises.editTitle")}</h1>
      <div className="mt-6">
        <ExerciseForm
          defaultValues={exercise}
          isPending={updateExercise.isPending}
          onSubmit={(data) => {
            updateExercise.mutate(
              {
                id: exerciseId,
                ...data,
                progression_levels: data.progression_levels.map((p) => p.name),
              },
              { onSuccess: () => router.push(`/exercises/${exerciseId}`) }
            );
          }}
        />
      </div>
    </div>
  );
}
