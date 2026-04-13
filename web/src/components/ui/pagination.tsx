"use client";

import type { PaginationMeta } from "@/types";
import { useTranslation } from "@/i18n";

export default function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  if (!meta.has_prev && !meta.has_next) return null;

  const totalPages = Math.ceil(meta.total / meta.per_page);

  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        onClick={() => onPageChange(meta.page - 1)}
        disabled={!meta.has_prev}
        className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
      >
        {t("common.previous")}
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {t("common.pageOf", { page: meta.page, total: totalPages })}
      </span>
      <button
        onClick={() => onPageChange(meta.page + 1)}
        disabled={!meta.has_next}
        className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
      >
        {t("common.next")}
      </button>
    </div>
  );
}
