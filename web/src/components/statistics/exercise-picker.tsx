"use client";

import { useState } from "react";
import { useExercises, useExerciseDefs } from "@/hooks/use-exercises";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import SearchInput from "@/components/ui/search-input";
import { useTranslation } from "@/i18n";

export default function ExercisePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data } = useExercises(1, "mine", undefined, undefined, undefined, debouncedSearch);
  const found = data?.data ?? [];

  // Keep the selected exercise as an option even if the search hides it.
  const selectedMissing = value !== null && !found.some((ex) => ex.id === value);
  const { defs: selectedDefs } = useExerciseDefs(selectedMissing ? [value] : []);
  const exercises = [...selectedDefs, ...found];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("statistics.exercisePicker.label")}
      </label>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("exercises.searchPlaceholder")}
        className="mt-1 w-full max-w-xs"
      />
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
