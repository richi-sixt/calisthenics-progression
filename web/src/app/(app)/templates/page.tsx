"use client";

import Link from "next/link";
import { useTemplates } from "@/hooks/use-templates";
import TemplateCard from "@/components/template/template-card";
import PageHeader from "@/components/ui/page-header";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, TemplateCardSkeleton } from "@/components/ui/skeleton";

export default function TemplatesPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useTemplates();
  const templates = data?.data ?? [];

  return (
    <div>
      <PageHeader title={t("templates.title")}>
        <Link
          href="/templates/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("templates.new")}
        </Link>
      </PageHeader>

      {isLoading && <CardListSkeleton count={3} Card={TemplateCardSkeleton} />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && templates.length === 0 && (
        <EmptyState
          title={t("templates.empty")}
          description={t("templates.emptyDescription")}
        />
      )}

      {templates.length > 0 && (
        <div className="mt-4 space-y-3">
          {templates.map((tmpl) => (
            <TemplateCard key={tmpl.id} template={tmpl} />
          ))}
        </div>
      )}
    </div>
  );
}
