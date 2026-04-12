"use client";

import type { PaginationMeta } from "@/types";

export default function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  if (!meta.has_prev && !meta.has_next) return null;

  const totalPages = Math.ceil(meta.total / meta.per_page);

  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        onClick={() => onPageChange(meta.page - 1)}
        disabled={!meta.has_prev}
        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-500">
        Page {meta.page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(meta.page + 1)}
        disabled={!meta.has_next}
        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
