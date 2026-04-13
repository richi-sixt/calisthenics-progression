"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useExercises } from "@/hooks/use-exercises";
import { useCategories } from "@/hooks/use-categories";
import { useTranslation } from "@/i18n";
import type { Workout, ExerciseDefinition } from "@/types";

/** Convert total seconds to "mm:ss" string */
function secondsToMmss(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(1, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Convert "mm:ss" or "m:ss" string to total seconds. Returns null if invalid. */
function mmssToSeconds(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const mins = Number(match[1]);
  const secs = Number(match[2]);
  if (secs >= 60) return null;
  return mins * 60 + secs;
}

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
  const { t } = useTranslation();

  // Exercise filtering state
  const [showOnlyMine, setShowOnlyMine] = useState(true);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);

  const userFilter = showOnlyMine ? "mine" : "all";
  const { data: exData } = useExercises(1, userFilter, selectedCatIds.length > 0 ? selectedCatIds : undefined);
  const exerciseDefs = exData?.data ?? [];

  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

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
              duration: s.duration != null ? secondsToMmss(s.duration) : "",
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

  // Build a lookup map from exercise definition id -> definition
  const exerciseDefMap = useMemo(() => {
    const map = new Map<number, ExerciseDefinition>();
    for (const def of exerciseDefs) {
      map.set(def.id, def);
    }
    return map;
  }, [exerciseDefs]);

  const toggleCategory = (catId: number) => {
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const submit = (data: WorkoutFormData) => {
    onSubmit({
      title: data.title,
      exercises: data.exercises.map((ex) => ({
        exercise_definition_id: Number(ex.exercise_definition_id),
        sets: ex.sets.map((s) => ({
            progression: s.progression || null,
            reps: s.reps ? Number(s.reps) : null,
            duration: s.duration ? mmssToSeconds(s.duration) : null,
          })),
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("workoutForm.title")}</label>
        <input
          {...register("title", { required: true })}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder={t("workoutForm.titlePlaceholder")}
        />
      </div>

      {/* Exercise filter controls */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showOnlyMine}
            onChange={(e) => setShowOnlyMine(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          {t("workoutForm.showOnlyMine")}
        </label>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  selectedCatIds.includes(cat.id)
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
            {selectedCatIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCatIds([])}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {t("common.clear")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("workoutForm.exercises")}</label>
        {exerciseFields.map((field, exIndex) => (
          <ExerciseBlock
            key={field.id}
            exIndex={exIndex}
            register={register}
            control={control}
            exerciseDefs={exerciseDefs}
            exerciseDefMap={exerciseDefMap}
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
          {t("workoutForm.addExercise")}
        </button>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? t("common.saving") : submitLabel}
      </button>
    </form>
  );
}

function ExerciseBlock({
  exIndex,
  register,
  control,
  exerciseDefs,
  exerciseDefMap,
  onRemove,
}: {
  exIndex: number;
  register: ReturnType<typeof useForm<WorkoutFormData>>["register"];
  control: ReturnType<typeof useForm<WorkoutFormData>>["control"];
  exerciseDefs: ExerciseDefinition[];
  exerciseDefMap: Map<number, ExerciseDefinition>;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const {
    fields: setFields,
    append: appendSet,
    remove: removeSet,
  } = useFieldArray({ control, name: `exercises.${exIndex}.sets` });

  // Watch which exercise is selected to get its counting_type and progression_levels
  const selectedDefId = useWatch({
    control,
    name: `exercises.${exIndex}.exercise_definition_id`,
  });

  const selectedDef = selectedDefId ? exerciseDefMap.get(Number(selectedDefId)) : undefined;
  const countingType = selectedDef?.counting_type ?? "reps";
  const progressionLevels = selectedDef?.progression_levels ?? [];
  const hasProgressionLevels = progressionLevels.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2">
        <select
          {...register(`exercises.${exIndex}.exercise_definition_id`, { required: true })}
          className="min-w-0 flex-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">{t("workoutForm.selectExercise")}</option>
          {exerciseDefs.map((def) => (
            <option key={def.id} value={def.id}>
              {def.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="shrink-0 text-sm text-red-500 hover:text-red-700">
          {t("common.remove")}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {/* Column headers -- desktop only */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="w-10">{t("workouts.set")}</span>
          <span>{t("workouts.progression")}</span>
          <span>{countingType === "duration" ? t("workouts.durationSeconds") : t("workouts.reps")}</span>
          <span></span>
        </div>
        {setFields.map((setField, setIndex) => (
          <div key={setField.id} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 sm:border-0 sm:p-0 sm:grid sm:grid-cols-[auto_1fr_1fr_auto] sm:gap-2 sm:items-center">
            {/* Mobile: set label + remove in a row */}
            <div className="flex items-center justify-between sm:hidden mb-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("workouts.set")} {setIndex + 1}</span>
              <button
                type="button"
                onClick={() => removeSet(setIndex)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                x
              </button>
            </div>

            {/* Desktop: set number */}
            <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 w-10">{t("workouts.set")} {setIndex + 1}</span>

            {/* Progression + Reps/Duration — stack on mobile, inline on desktop */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
              {/* Progression */}
              {hasProgressionLevels ? (
                <select
                  {...register(`exercises.${exIndex}.sets.${setIndex}.progression`)}
                  className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm"
                >
                  <option value="">---</option>
                  {progressionLevels.map((level) => (
                    <option key={level.id} value={level.name}>
                      {level.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...register(`exercises.${exIndex}.sets.${setIndex}.progression`)}
                  className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm"
                  placeholder="e.g. Standard"
                />
              )}

              {/* Reps or Duration */}
              {countingType === "duration" ? (
                <input
                  {...register(`exercises.${exIndex}.sets.${setIndex}.duration`, {
                    pattern: /^\d{1,2}:\d{2}$/,
                  })}
                  className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm"
                  placeholder="0:00"
                />
              ) : (
                <input
                  {...register(`exercises.${exIndex}.sets.${setIndex}.reps`)}
                  type="number"
                  className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm"
                  placeholder="0"
                />
              )}
            </div>

            {/* Desktop: remove button */}
            <button
              type="button"
              onClick={() => removeSet(setIndex)}
              className="hidden sm:block text-xs text-red-400 hover:text-red-600"
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
          {t("workoutForm.addSet")}
        </button>
      </div>
    </div>
  );
}
