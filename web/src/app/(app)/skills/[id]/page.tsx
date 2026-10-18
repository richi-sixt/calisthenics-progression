"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSkill, useDeleteSkill } from "@/hooks/use-skills";
import SkillExerciseRow from "@/components/skill/skill-exercise-row";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Markdown } from "@/components/ui/markdown";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const skillId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useSkill(skillId);
  const deleteSkill = useDeleteSkill();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <Loading text={t("skills.loadingOne")} />;
  if (error || !data) return <ErrorMessage error={error} />;

  const skill = data.data;
  // App-library skills are managed in the app library, not under "my skills".
  const backHref = skill.is_catalog ? "/catalog?tab=skills" : "/skills";
  const backLabel = skill.is_catalog ? t("nav.catalog") : t("nav.skills");

  return (
    <div>
      <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: backLabel.toLowerCase() })}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{skill.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("skills.progress", {
              reached: skill.reached_count,
              total: skill.exercise_count,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/skills/${skill.id}/edit`}
            className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t("common.edit")}
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteSkill.mutate(skillId, { onSuccess: () => router.push(backHref) })
        }
        title={t("skills.deleteConfirmTitle")}
        message={t("skills.deleteConfirmMessage")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />

      {skill.description && (
        <Markdown className="mt-4 text-gray-600 dark:text-gray-400">{skill.description}</Markdown>
      )}

      {skill.exercises.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("skills.noExercises")}</p>
      ) : (
        <ol className="mt-6 space-y-3">
          {skill.exercises.map((exercise, index) => (
            <SkillExerciseRow
              key={exercise.exercise_id}
              exercise={exercise}
              index={index}
              isNext={exercise.exercise_id === skill.next_exercise_id}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
