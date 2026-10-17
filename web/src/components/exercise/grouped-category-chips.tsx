"use client";

import { useCategories, useCategoryGroups } from "@/hooks/use-categories";
import { useTranslation } from "@/i18n";

/**
 * Category chips, one titled section per category group (plus a trailing
 * "no group" section). Toggling is controlled by the parent.
 */
export default function GroupedCategoryChips({
  selectedIds,
  onChange,
  size = "md",
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();
  const { data: catData } = useCategories();
  const { data: groupData } = useCategoryGroups();
  const categories = catData?.data ?? [];
  const groups = groupData?.data ?? [];

  if (categories.length === 0) return null;

  const toggle = (id: number) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );

  const sections = [
    ...groups.map((g) => ({
      key: `g-${g.id}`,
      title: g.name,
      items: categories.filter((c) => c.group_id === g.id),
    })),
    {
      key: "none",
      title: groups.length > 0 ? t("categories.noGroup") : null,
      items: categories.filter(
        (c) => c.group_id === null || !groups.some((g) => g.id === c.group_id)
      ),
    },
  ].filter((s) => s.items.length > 0);

  const chip =
    size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div key={section.key}>
          {section.title && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {section.title}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {section.items.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className={`rounded-full ${chip} font-medium transition-colors ${
                  selectedIds.includes(cat.id)
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
