"use client";

import { useCategories } from "@/hooks/use-categories";

export default function CategoryFilter({
  selectedIds,
  onChange,
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const { data } = useCategories();
  const categories = data?.data ?? [];

  if (categories.length === 0) return null;

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => toggle(cat.id)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            selectedIds.includes(cat.id)
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
