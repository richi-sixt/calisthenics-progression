"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateWorkout } from "@/hooks/use-workouts";
import { useTemplates } from "@/hooks/use-templates";
import { useWorkout } from "@/hooks/use-workouts";
import WorkoutExerciseForm from "@/components/workout/workout-exercise-form";
import type { Workout } from "@/types";

export default function NewWorkoutPage() {
  const router = useRouter();
  const createWorkout = useCreateWorkout();
  const { data: templatesData } = useTemplates();
  const templates = templatesData?.data ?? [];

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [loadedTemplate, setLoadedTemplate] = useState<Partial<Workout> | null>(null);

  // Fetch template detail when selected
  const { data: templateDetail } = useWorkout(selectedTemplateId ?? 0);

  const handleLoadTemplate = () => {
    if (templateDetail?.data) {
      setLoadedTemplate(templateDetail.data);
    }
  };

  return (
    <div>
      <Link href="/workouts" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to workouts
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New Workout</h1>

      {/* Load from template */}
      {templates.length > 0 && !loadedTemplate && (
        <div className="mt-4 flex items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Load from template
            </label>
            <select
              value={selectedTemplateId ?? ""}
              onChange={(e) =>
                setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleLoadTemplate}
            disabled={!selectedTemplateId || !templateDetail?.data}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Load
          </button>
        </div>
      )}

      <div className="mt-6">
        <WorkoutExerciseForm
          key={loadedTemplate ? `tpl-${selectedTemplateId}` : "empty"}
          defaultValues={loadedTemplate ?? undefined}
          isPending={createWorkout.isPending}
          submitLabel="Create Workout"
          onSubmit={(data) => {
            createWorkout.mutate(data, {
              onSuccess: () => router.push("/workouts"),
            });
          }}
        />
      </div>
    </div>
  );
}
