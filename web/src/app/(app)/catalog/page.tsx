"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCatalogExercises,
  useImportCatalogExercise,
  useCatalogSkills,
  useImportCatalogSkill,
} from "@/hooks/use-catalog";
import { formatSkillValue } from "@/components/skill/format";
import { useProfile } from "@/hooks/use-profile";
import Pagination from "@/components/ui/pagination";
import PageHeader from "@/components/ui/page-header";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, ExerciseCardSkeleton } from "@/components/ui/skeleton";
import { markdownToPlainText } from "@/lib/markdown-plain-text";
import { ownImageUrl } from "@/lib/uploaded-images";

export default function CatalogPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  // The tab lives in the URL so menu links, back and sharing all work.
  const tab: "exercises" | "skills" = searchParams.get("tab") === "skills" ? "skills" : "exercises";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: profile } = useProfile();
  const isAdmin = profile?.data?.admin === true;
  const { data, isLoading, error } = useCatalogExercises(page, search);
  const importExercise = useImportCatalogExercise();
  const skillsQuery = useCatalogSkills(search);
  const importSkill = useImportCatalogSkill();
  const skills = skillsQuery.data?.data ?? [];

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title={t("catalog.title")}>
        {isAdmin && (
          <Link
            href={tab === "skills" ? "/skills/new?catalog=1" : "/exercises/new?catalog=1"}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {tab === "skills" ? t("catalog.newSkill") : t("catalog.new")}
          </Link>
        )}
      </PageHeader>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("catalog.intro")}</p>

      <div className="mt-4 inline-flex rounded-md bg-gray-100 dark:bg-gray-700 p-0.5 text-sm">
        {(["exercises", "skills"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              router.replace(key === "skills" ? "/catalog?tab=skills" : "/catalog");
              setPage(1);
            }}
            className={`rounded px-3 py-1 font-medium transition-colors ${
              tab === key
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {key === "exercises" ? t("catalog.tabExercises") : t("catalog.tabSkills")}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder={tab === "skills" ? t("catalog.searchSkills") : t("catalog.searchPlaceholder")}
        aria-label={t("catalog.searchPlaceholder")}
        className="mt-3 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      {tab === "skills" && (
        <div className="mt-4 space-y-3">
          {skillsQuery.isLoading && <CardListSkeleton count={2} Card={ExerciseCardSkeleton} />}
          {skillsQuery.error && <ErrorMessage error={skillsQuery.error} />}
          {!skillsQuery.isLoading && !skillsQuery.error && skills.length === 0 && (
            <EmptyState title={t("catalog.skillsEmpty")} />
          )}
          {skills.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("catalog.skillImportHint")}</p>
          )}
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">{skill.title}</p>
              {skill.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {markdownToPlainText(skill.description)}
                </p>
              )}
              <ol className="mt-2 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                {skill.exercises.map((e, i) => {
                  const thumb = ownImageUrl(e.thumbnail_url);
                  return (
                    <li key={e.exercise_id} className="flex items-center gap-2">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 flex-shrink-0 rounded-md object-cover bg-gray-100 dark:bg-gray-700"
                        />
                      ) : (
                        <span className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 dark:bg-gray-700" />
                      )}
                      <span>
                        {i + 1}. {e.title} ({formatSkillValue(e.counting_type, e.target_value)})
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {skill.imported_skill_id !== null ? (
                  <Link
                    href={`/skills/${skill.imported_skill_id}`}
                    className="rounded-md bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400"
                  >
                    ✓ {t("catalog.skillImported")}
                  </Link>
                ) : (
                  !(isAdmin && skill.user_id === profile?.data?.id) && (
                    <button
                      type="button"
                      onClick={() => importSkill.mutate(skill.id)}
                      disabled={importSkill.isPending}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importSkill.isPending && importSkill.variables === skill.id
                        ? t("catalog.importing")
                        : t("catalog.importSkill")}
                    </button>
                  )
                )}
                {isAdmin && skill.user_id === profile?.data?.id && (
                  <Link
                    href={`/skills/${skill.id}/edit`}
                    className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {t("catalog.edit")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "exercises" && isLoading && <CardListSkeleton count={3} Card={ExerciseCardSkeleton} />}
      {tab === "exercises" && error && <ErrorMessage error={error} />}

      {tab === "exercises" && !isLoading && !error && exercises.length === 0 && (
        <EmptyState title={t("catalog.empty")} description={t("catalog.emptyDescription")} />
      )}

      <div className="mt-4 space-y-3">
        {tab === "exercises" && exercises.map((ex) => {
          const thumb = ownImageUrl(ex.thumbnail_url);
          return (
          <div
            key={ex.id}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <div className="flex min-w-0 gap-3">
              {thumb && (
                <Link href={`/exercises/${ex.id}`} className="flex-shrink-0">
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 rounded-md object-cover bg-gray-100 dark:bg-gray-700"
                  />
                </Link>
              )}
              <div className="min-w-0 flex-1">
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
              </div>
            </div>
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
          );
        })}
      </div>

      {tab === "exercises" && meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
