"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ExerciseForm from "@/components/exercise/exercise-form";
import { useCreateExercise } from "@/hooks/use-exercises";
import { useTranslation } from "@/i18n";

export default function NewExercisePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const createExercise = useCreateExercise();

  return (
    <div>
      <Link href="/exercises" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.exercises").toLowerCase() })}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t("exercises.new")}</h1>
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
