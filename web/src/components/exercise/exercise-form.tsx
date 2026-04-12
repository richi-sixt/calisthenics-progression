"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useCategories } from "@/hooks/use-categories";
import type { ExerciseDefinition } from "@/types";

interface ExerciseFormData {
  title: string;
  description: string;
  counting_type: "reps" | "duration";
  progression_levels: { name: string }[];
  category_ids: number[];
}

export default function ExerciseForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<ExerciseDefinition>;
  onSubmit: (data: ExerciseFormData) => void;
  isPending: boolean;
}) {
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  const { register, handleSubmit, control, watch, setValue } =
    useForm<ExerciseFormData>({
      defaultValues: {
        title: defaultValues?.title ?? "",
        description: defaultValues?.description ?? "",
        counting_type: defaultValues?.counting_type ?? "reps",
        progression_levels:
          defaultValues?.progression_levels?.map((p) => ({ name: p.name })) ??
          [],
        category_ids: defaultValues?.category_ids ?? [],
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "progression_levels",
  });

  const selectedCats: number[] = watch("category_ids") ?? [];

  const toggleCategory = (catId: number) => {
    const next = selectedCats.includes(catId)
      ? selectedCats.filter((id) => id !== catId)
      : [...selectedCats, catId];
    setValue("category_ids", next, { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          {...register("title", { required: true })}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="e.g. Push-ups"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          {...register("description")}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Optional description..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Counting Type
        </label>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="reps" {...register("counting_type")} />
            Reps
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="duration"
              {...register("counting_type")}
            />
            Duration
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Progression Levels
        </label>
        <div className="mt-2 space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="w-6 text-xs text-gray-400">{index + 1}.</span>
              <input
                {...register(`progression_levels.${index}.name`, {
                  required: true,
                })}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Level name"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-sm text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => append({ name: "" })}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add level
        </button>
      </div>

      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Categories
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedCats.includes(cat.id)
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Exercise"}
      </button>
    </form>
  );
}
