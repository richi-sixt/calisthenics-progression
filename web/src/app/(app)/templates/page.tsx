"use client";

import Link from "next/link";
import { useTemplates } from "@/hooks/use-templates";
import TemplateCard from "@/components/template/template-card";
import PageHeader from "@/components/ui/page-header";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";

export default function TemplatesPage() {
  const { data, isLoading, error } = useTemplates();
  const templates = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Templates">
        <Link
          href="/templates/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Template
        </Link>
      </PageHeader>

      {isLoading && <Loading text="Loading templates..." />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && templates.length === 0 && (
        <EmptyState
          title="No templates yet"
          description="Create a template to quickly start workouts with predefined exercises."
        />
      )}

      {templates.length > 0 && (
        <div className="mt-4 space-y-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}
