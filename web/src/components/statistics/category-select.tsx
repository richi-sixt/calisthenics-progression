"use client";

import { useCategories } from "@/hooks/use-categories";
import { useTranslation } from "@/i18n";

export default function CategorySelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const { data } = useCategories();
  const categories = data?.data ?? [];

  if (categories.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("statistics.categoryFilter.label")}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        <option value="">{t("statistics.categoryFilter.all")}</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
}
