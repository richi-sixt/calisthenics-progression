"use client";

import Link from "next/link";
import type { Workout } from "@/types";
import { useDeleteTemplate, useUseTemplate } from "@/hooks/use-templates";
import { useRouter } from "next/navigation";

export default function TemplateCard({ template }: { template: Workout }) {
  const deleteTemplate = useDeleteTemplate();
  const useTemplate = useUseTemplate();
  const router = useRouter();

  const exerciseCount = template.exercises?.length ?? 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-gray-900">{template.title}</p>
          <p className="mt-1 text-sm text-gray-500">
            {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
          </p>
          {template.exercises && template.exercises.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {template.exercises.map((e) => e.exercise_definition_title).filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="ml-4 flex items-center gap-2">
          <button
            onClick={() =>
              useTemplate.mutate(template.id, {
                onSuccess: (data) => router.push(`/workouts/${data.data.id}`),
              })
            }
            disabled={useTemplate.isPending}
            className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
          >
            {useTemplate.isPending ? "Creating..." : "Start Workout"}
          </button>
          <Link
            href={`/templates/${template.id}/edit`}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            Edit
          </Link>
          <button
            onClick={() => {
              if (confirm("Delete this template?")) deleteTemplate.mutate(template.id);
            }}
            disabled={deleteTemplate.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
