"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkout } from "@/hooks/use-workouts";
import { useUpdateTemplate } from "@/hooks/use-templates";
import WorkoutExerciseForm from "@/components/workout/workout-exercise-form";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const templateId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useWorkout(templateId);
  const updateTemplate = useUpdateTemplate();

  if (isLoading) return <Loading text={t("templates.loading")} />;
  if (error || !data) return <ErrorMessage error={error} />;

  return (
    <div>
      <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.templates").toLowerCase() })}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t("templates.editTitle")}</h1>
      <div className="mt-6">
        <WorkoutExerciseForm
          defaultValues={data.data}
          isPending={updateTemplate.isPending}
          submitLabel="Update Template"
          onSubmit={(formData) => {
            updateTemplate.mutate(
              { id: templateId, ...formData },
              { onSuccess: () => router.push("/templates") }
            );
          }}
        />
      </div>
    </div>
  );
}
