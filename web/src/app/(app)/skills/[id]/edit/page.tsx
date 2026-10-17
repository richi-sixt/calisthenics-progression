"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SkillForm from "@/components/skill/skill-form";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import { useSkill, useUpdateSkill } from "@/hooks/use-skills";
import { useTranslation } from "@/i18n";

export default function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const skillId = Number(id);
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useSkill(skillId);
  const updateSkill = useUpdateSkill();

  if (isLoading) return <Loading text={t("skills.loadingOne")} />;
  if (error || !data) return <ErrorMessage error={error} />;

  return (
    <div>
      <Link href={`/skills/${skillId}`} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.skills").toLowerCase() })}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t("skills.editTitle")}</h1>
      <div className="mt-6">
        <SkillForm
          defaultValues={data.data}
          isPending={updateSkill.isPending}
          error={updateSkill.error?.message}
          onSubmit={(body) =>
            updateSkill.mutate(
              { id: skillId, ...body },
              { onSuccess: () => router.push(`/skills/${skillId}`) }
            )
          }
        />
      </div>
    </div>
  );
}
