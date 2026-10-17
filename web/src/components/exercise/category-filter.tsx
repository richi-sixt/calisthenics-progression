"use client";

import GroupedCategoryChips from "@/components/exercise/grouped-category-chips";

export default function CategoryFilter({
  selectedIds,
  onChange,
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  return <GroupedCategoryChips selectedIds={selectedIds} onChange={onChange} />;
}
