"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkout } from "@/hooks/use-workouts";
import { useUpdateTemplate } from "@/hooks/use-templates";
import WorkoutExerciseForm from "@/components/workout/workout-exercise-form";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const templateId = Number(id);
  const router = useRouter();
  // Templates are workouts with is_template=true, reuse useWorkout to fetch detail
  const { data, isLoading, error } = useWorkout(templateId);
  const updateTemplate = useUpdateTemplate();

  if (isLoading) return <Loading text="Loading template..." />;
  if (error || !data) return <ErrorMessage error={error} />;

  return (
    <div>
      <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to templates
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Edit Template</h1>
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
