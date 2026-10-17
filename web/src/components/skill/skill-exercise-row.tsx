"use client";

import Link from "next/link";
import { parseISO } from "date-fns";
import { useTranslation } from "@/i18n";
import type { SkillExercise } from "@/types";
import { formatSkillValue } from "@/components/skill/format";

/** One exercise of a skill with the best result vs. the target; green when reached. */
export default function SkillExerciseRow({
  exercise,
  index,
  isNext,
}: {
  exercise: SkillExercise;
  index: number;
  isNext: boolean;
}) {
  const { t, formatDate } = useTranslation();
  const percent = Math.min(100, Math.round((exercise.best / exercise.target_value) * 100));

  return (
    <li
      data-testid={`skill-exercise-${exercise.exercise_id}`}
      data-reached={exercise.reached}
      className={`rounded-lg border px-4 py-3 ${
        exercise.reached
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
            exercise.reached
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {exercise.reached ? "✓" : index + 1}
        </span>
        <Link
          href={`/exercises/${exercise.exercise_id}`}
          className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-gray-100"
        >
          {exercise.title}
        </Link>
        {isNext && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {t("skills.next")}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        >
          <div
            className={`h-full ${exercise.reached ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span
          className={`text-sm tabular-nums ${
            exercise.reached
              ? "font-semibold text-green-700 dark:text-green-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {formatSkillValue(exercise.counting_type, exercise.best)} /{" "}
          {formatSkillValue(exercise.counting_type, exercise.target_value)}
        </span>
      </div>
      {exercise.last_done_date && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {t("skills.lastDone", { date: formatDate(parseISO(exercise.last_done_date)) })}
        </p>
      )}
    </li>
  );
}
