"use client";

import Link from "next/link";
import type { Workout, Exercise } from "@/types";
import { useDeleteTemplate, useUseTemplate } from "@/hooks/use-templates";
import { useRouter } from "next/navigation";

function formatTemplateSets(exercise: Exercise): string {
  const sets = exercise.sets ?? [];
  if (sets.length === 0) return "No sets";

  const parts: string[] = [`${sets.length} ${sets.length === 1 ? "Set" : "Sets"}`];

  // Show individual set details like Flask does
  const setDetails = sets.map((s) => {
    if (s.reps != null && s.reps > 0) return `${s.reps} Reps`;
    if (s.duration != null && s.duration > 0) {
      const mins = Math.floor(s.duration / 60);
      const secs = s.duration % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${s.duration}s`;
    }
    if (s.progression) return s.progression;
    return null;
  }).filter(Boolean);

  if (setDetails.length > 0) {
    parts.push(`( ${setDetails.join(", ")} )`);
  }

  return parts.join(" ");
}

export default function TemplateCard({ template }: { template: Workout }) {
  const deleteTemplate = useDeleteTemplate();
  const useTemplate = useUseTemplate();
  const router = useRouter();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-gray-900">{template.title}</p>

          {/* Exercise detail list */}
          {template.exercises && template.exercises.length > 0 && (
            <div className="mt-2 space-y-0.5 text-sm text-gray-600">
              {template.exercises.map((ex, i) => (
                <p key={ex.id}>
                  <span className="text-gray-400">{i + 1}.</span>{" "}
                  <span className="font-medium">
                    {ex.exercise_definition_title ?? "Exercise"}
                  </span>
                  <span className="text-gray-400"> — </span>
                  <span>{formatTemplateSets(ex)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="ml-4 flex items-center gap-2">
          <button
            onClick={() =>
              useTemplate.mutate(template.id, {
                onSuccess: (data) => router.push(`/workouts/${data.data.id}/edit`),
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
