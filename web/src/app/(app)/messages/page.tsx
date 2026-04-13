"use client";

import { useState } from "react";
import Link from "next/link";
import { useMessages } from "@/hooks/use-messages";
import MessageCard from "@/components/message/message-card";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, MessageCardSkeleton } from "@/components/ui/skeleton";

export default function MessagesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useMessages(page);
  const messages = data?.data ?? [];

  return (
    <div>
      <PageHeader title={t("messages.title")}>
        <Link
          href="/messages/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("messages.new")}
        </Link>
      </PageHeader>

      {isLoading && <CardListSkeleton count={3} Card={MessageCardSkeleton} />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && messages.length === 0 && (
        <EmptyState
          title={t("messages.empty")}
          description={t("messages.emptyDescription")}
        />
      )}

      {messages.length > 0 && (
        <div className="mt-4 space-y-3">
          {messages.map((m) => (
            <MessageCard key={m.id} message={m} />
          ))}
        </div>
      )}

      {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
    </div>
  );
}
