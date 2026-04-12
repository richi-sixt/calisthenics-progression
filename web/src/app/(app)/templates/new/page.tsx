"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import WorkoutExerciseForm from "@/components/workout/workout-exercise-form";
import { useCreateTemplate } from "@/hooks/use-templates";

export default function NewTemplatePage() {
  const router = useRouter();
  const createTemplate = useCreateTemplate();

  return (
    <div>
      <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to templates
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New Template</h1>
      <div className="mt-6">
        <WorkoutExerciseForm
          isPending={createTemplate.isPending}
          submitLabel="Create Template"
          onSubmit={(data) => {
            createTemplate.mutate(data, {
              onSuccess: () => router.push("/templates"),
            });
          }}
        />
      </div>
    </div>
  );
}
