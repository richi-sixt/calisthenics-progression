"use client";

import { useMemo, useState } from "react";
import { useExercises } from "@/hooks/use-exercises";
import { useCatalogExercises } from "@/hooks/use-catalog";
import type { SkillInput } from "@/hooks/use-skills";
import { useTranslation } from "@/i18n";
import type { Skill } from "@/types";

interface Row {
  exercise_id: number;
  title: string;
  counting_type: "reps" | "duration" | "km";
  target_value: string;
}

const inputClass =
  "rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const iconButton =
  "rounded px-1.5 py-0.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700";

export default function SkillForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  catalog,
}: {
  defaultValues?: Skill;
  onSubmit: (data: SkillInput) => void;
  isPending: boolean;
  error?: string | null;
  /** Editing an app-library skill (admin): offer library exercises. */
  catalog?: boolean;
}) {
  const { t } = useTranslation();
  const isCatalog = catalog ?? defaultValues?.is_catalog ?? false;
  const { data: ownData } = useExercises(1, "mine");
  const { data: catalogData } = useCatalogExercises(1, "");
  const data = isCatalog ? catalogData : ownData;
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [rows, setRows] = useState<Row[]>(
    defaultValues?.exercises.map((e) => ({
      exercise_id: e.exercise_id,
      title: e.archived ? `${e.title} (${t("skills.archivedExercise")})` : e.title,
      counting_type: e.counting_type,
      target_value: String(e.target_value),
    })) ?? []
  );
  const [selected, setSelected] = useState("");

  const candidates = useMemo(() => {
    const taken = new Set(rows.map((r) => r.exercise_id));
    return (data?.data ?? []).filter(
      (e) => !taken.has(e.id) && e.counting_type !== "km"
    );
  }, [data, rows]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setRows(next);
  };

  const add = () => {
    const exercise = candidates.find((e) => String(e.id) === selected);
    if (!exercise) return;
    setRows([
      ...rows,
      {
        exercise_id: exercise.id,
        title: exercise.title,
        counting_type: exercise.counting_type,
        target_value: exercise.counting_type === "duration" ? "10" : "8",
      },
    ]);
    setSelected("");
  };

  const targetsValid = rows.every((r) => Number(r.target_value) >= 1);
  const canSave = title.trim().length > 0 && targetsValid && !isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      exercises: rows.map((r) => ({
        exercise_id: r.exercise_id,
        target_value: Number(r.target_value),
      })),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("skills.name")}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder={t("skills.namePlaceholder")}
          className={`mt-1 w-full ${inputClass}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("skills.description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`mt-1 w-full ${inputClass}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("skills.exercises")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("skills.exercisesHint")}</p>

        <ul className="mt-2 space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.exercise_id}
              data-testid={`skill-row-${row.exercise_id}`}
              className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
                {row.title}
              </span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={row.target_value}
                onChange={(e) =>
                  setRows(
                    rows.map((r, i) =>
                      i === index ? { ...r, target_value: e.target.value } : r
                    )
                  )
                }
                aria-label={t("skills.targetLabel", { title: row.title })}
                className={`w-20 ${inputClass} py-1`}
              />
              <span className="w-12 text-xs text-gray-500 dark:text-gray-400">
                {row.counting_type === "duration"
                  ? t("skills.targetSeconds")
                  : t("skills.targetReps")}
              </span>
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={t("exerciseForm.moveUp", { title: row.title })}
                className={iconButton}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === rows.length - 1}
                aria-label={t("exerciseForm.moveDown", { title: row.title })}
                className={iconButton}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r.exercise_id !== row.exercise_id))}
                className="text-sm text-red-400 hover:text-red-600"
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label={t("skills.addExercise")}
            className={`min-w-0 flex-1 ${inputClass} py-1.5`}
          >
            <option value="">
              {candidates.length === 0 ? t("skills.noCandidates") : t("skills.selectExercise")}
            </option>
            {candidates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!selected}
            aria-label={t("skills.addExercise")}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            +
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!canSave}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? t("common.saving") : t("skills.save")}
      </button>
    </form>
  );
}
