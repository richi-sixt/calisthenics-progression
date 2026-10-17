"use client";

import Link from "next/link";
import { useSkills } from "@/hooks/use-skills";
import PageHeader from "@/components/ui/page-header";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { markdownToPlainText } from "@/lib/markdown-plain-text";
import { CardListSkeleton, CategorySkeleton } from "@/components/ui/skeleton";

export default function SkillsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useSkills();
  const skills = data?.data ?? [];

  return (
    <div>
      <PageHeader title={t("skills.title")}>
        <Link
          href="/skills/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("skills.new")}
        </Link>
      </PageHeader>

      {isLoading && <CardListSkeleton count={3} Card={CategorySkeleton} />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && skills.length === 0 && (
        <EmptyState title={t("skills.empty")} description={t("skills.emptyDescription")} />
      )}

      <div className="mt-4 space-y-3">
        {skills.map((skill) => {
          const complete = skill.exercise_count > 0 && skill.reached_count === skill.exercise_count;
          return (
            <Link
              key={skill.id}
              href={`/skills/${skill.id}`}
              className={`block rounded-lg border px-4 py-3 hover:shadow-sm ${
                complete
                  ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{skill.title}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("skills.progress", {
                    reached: skill.reached_count,
                    total: skill.exercise_count,
                  })}
                </span>
              </div>
              {skill.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {markdownToPlainText(skill.description)}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
