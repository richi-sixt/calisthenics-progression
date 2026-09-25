"use client";

import { useTranslation } from "@/i18n";
import type { ProgressionLevel } from "@/types";

export default function ProgressionFilter({
  levels,
  value,
  onChange,
}: {
  levels: ProgressionLevel[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { t } = useTranslation();

  if (levels.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("statistics.progressionFilter.label")}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        <option value="">{t("statistics.progressionFilter.all")}</option>
        {[...levels]
          .sort((a, b) => a.level_order - b.level_order)
          .map((level) => (
            <option key={level.id} value={level.name}>
              {level.name}
            </option>
          ))}
      </select>
    </div>
  );
}
