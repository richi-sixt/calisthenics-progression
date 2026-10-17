"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SkillForm from "@/components/skill/skill-form";
import { useCreateSkill } from "@/hooks/use-skills";
import { useTranslation } from "@/i18n";

export default function NewSkillPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const createSkill = useCreateSkill();
  const isCatalog = useSearchParams().get("catalog") === "1";

  return (
    <div>
      <Link href="/skills" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.skills").toLowerCase() })}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t("skills.new")}</h1>
      <div className="mt-6">
        <SkillForm
          catalog={isCatalog}
          isPending={createSkill.isPending}
          error={createSkill.error?.message}
          onSubmit={(data) =>
            createSkill.mutate(isCatalog ? { ...data, is_catalog: true } : data, {
              onSuccess: (res) => router.push(isCatalog ? "/catalog" : `/skills/${res.data.id}`),
            })
          }
        />
      </div>
    </div>
  );
}
