"use client";

import { useState } from "react";
import Link from "next/link";
import { useCatalogExercises, useImportCatalogExercise } from "@/hooks/use-catalog";
import { useProfile } from "@/hooks/use-profile";
import Pagination from "@/components/ui/pagination";
import PageHeader from "@/components/ui/page-header";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, ExerciseCardSkeleton } from "@/components/ui/skeleton";
import { markdownToPlainText } from "@/lib/markdown-plain-text";

export default function CatalogPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: profile } = useProfile();
  const isAdmin = profile?.data?.admin === true;
  const { data, isLoading, error } = useCatalogExercises(page, search);
  const importExercise = useImportCatalogExercise();

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title={t("catalog.title")}>
        {isAdmin && (
          <Link
            href="/exercises/new?catalog=1"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t("catalog.new")}
          </Link>
        )}
      </PageHeader>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("catalog.intro")}</p>

      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder={t("catalog.searchPlaceholder")}
        aria-label={t("catalog.searchPlaceholder")}
        className="mt-4 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      {isLoading && <CardListSkeleton count={3} Card={ExerciseCardSkeleton} />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && exercises.length === 0 && (
        <EmptyState title={t("catalog.empty")} description={t("catalog.emptyDescription")} />
      )}

      <div className="mt-4 space-y-3">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <Link
              href={`/exercises/${ex.id}`}
              className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600"
            >
              {ex.title}
            </Link>
            {ex.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {markdownToPlainText(ex.description)}
              </p>
            )}
            {ex.progressions.length > 0 && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t("exercises.progressions")} {ex.progressions.map((p) => p.title).join(" → ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ex.imported_exercise_id !== null ? (
                <Link
                  href={`/exercises/${ex.imported_exercise_id}`}
                  className="rounded-md bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400"
                >
                  ✓ {t("catalog.imported")}
                </Link>
              ) : (
                !(isAdmin && ex.user_id === profile?.data?.id) && (
                  <button
                    type="button"
                    onClick={() => importExercise.mutate(ex.id)}
                    disabled={importExercise.isPending}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {importExercise.isPending && importExercise.variables === ex.id
                      ? t("catalog.importing")
                      : t("catalog.import")}
                  </button>
                )
              )}
              {isAdmin && ex.user_id === profile?.data?.id && (
                <Link
                  href={`/exercises/${ex.id}/edit`}
                  className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t("catalog.edit")}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
