"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useExercises } from "@/hooks/use-exercises";
import type { Workout } from "@/types";

interface SetData {
  progression: string;
  reps: string;
  duration: string;
}

interface ExerciseData {
  exercise_definition_id: string;
  sets: SetData[];
}

interface WorkoutFormData {
  title: string;
  exercises: ExerciseData[];
}

export default function WorkoutExerciseForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = "Save",
}: {
  defaultValues?: Partial<Workout>;
  onSubmit: (data: { title: string; exercises: unknown[] }) => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  const { data: exData } = useExercises(1, "mine");
  const exerciseDefs = exData?.data ?? [];

  const { register, handleSubmit, control } = useForm<WorkoutFormData>({
    defaultValues: {
      title: defaultValues?.title ?? "",
      exercises:
        defaultValues?.exercises?.map((ex) => ({
          exercise_definition_id: String(ex.exercise_definition_id ?? ""),
          sets:
            ex.sets?.map((s) => ({
              progression: s.progression ?? "",
              reps: s.reps != null ? String(s.reps) : "",
              duration: s.duration != null ? String(s.duration) : "",
            })) ?? [{ progression: "", reps: "", duration: "" }],
        })) ?? [
          {
            exercise_definition_id: "",
            sets: [{ progression: "", reps: "", duration: "" }],
          },
        ],
    },
  });

  const {
    fields: exerciseFields,
    append: appendExercise,
    remove: removeExercise,
  } = useFieldArray({ control, name: "exercises" });

  const submit = (data: WorkoutFormData) => {
    onSubmit({
      title: data.title,
      exercises: data.exercises.map((ex) => ({
        exercise_definition_id: Number(ex.exercise_definition_id),
        sets: ex.sets
          .filter((s) => s.reps || s.duration)
          .map((s) => ({
            progression: s.progression || null,
            reps: s.reps ? Number(s.reps) : null,
            duration: s.duration ? Number(s.duration) : null,
          })),
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          {...register("title", { required: true })}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Workout title"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Exercises</label>
        {exerciseFields.map((field, exIndex) => (
          <ExerciseBlock
            key={field.id}
            exIndex={exIndex}
            register={register}
            control={control}
            exerciseDefs={exerciseDefs}
            onRemove={() => removeExercise(exIndex)}
          />
        ))}
        <button
          type="button"
          onClick={() =>
            appendExercise({
              exercise_definition_id: "",
              sets: [{ progression: "", reps: "", duration: "" }],
            })
          }
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + Add exercise
        </button>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function ExerciseBlock({
  exIndex,
  register,
  control,
  exerciseDefs,
  onRemove,
}: {
  exIndex: number;
  register: ReturnType<typeof useForm<WorkoutFormData>>["register"];
  control: ReturnType<typeof useForm<WorkoutFormData>>["control"];
  exerciseDefs: { id: number; title: string }[];
  onRemove: () => void;
}) {
  const {
    fields: setFields,
    append: appendSet,
    remove: removeSet,
  } = useFieldArray({ control, name: `exercises.${exIndex}.sets` });

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <select
          {...register(`exercises.${exIndex}.exercise_definition_id`, { required: true })}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select exercise...</option>
          {exerciseDefs.map((def) => (
            <option key={def.id} value={def.id}>
              {def.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="text-sm text-red-500 hover:text-red-700">
          Remove
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500">
          <span>Progression</span>
          <span>Reps</span>
          <span>Duration (s)</span>
          <span></span>
        </div>
        {setFields.map((setField, setIndex) => (
          <div key={setField.id} className="grid grid-cols-4 gap-2">
            <input
              {...register(`exercises.${exIndex}.sets.${setIndex}.progression`)}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="e.g. Standard"
            />
            <input
              {...register(`exercises.${exIndex}.sets.${setIndex}.reps`)}
              type="number"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="0"
            />
            <input
              {...register(`exercises.${exIndex}.sets.${setIndex}.duration`)}
              type="number"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => removeSet(setIndex)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              x
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => appendSet({ progression: "", reps: "", duration: "" })}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          + Add set
        </button>
      </div>
    </div>
  );
}
