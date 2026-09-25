"use client";

import { useExercises } from "@/hooks/use-exercises";
import { useTranslation } from "@/i18n";

export default function ExercisePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const { data } = useExercises(1, "mine");
  const exercises = data?.data ?? [];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("statistics.exercisePicker.label")}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        <option value="">{t("statistics.exercisePicker.placeholder")}</option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.title}
          </option>
        ))}
      </select>
    </div>
  );
}
