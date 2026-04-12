"use client";

import { useState } from "react";
import Link from "next/link";
import { useMessages } from "@/hooks/use-messages";
import MessageCard from "@/components/message/message-card";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";

export default function MessagesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useMessages(page);
  const messages = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Messages">
        <Link
          href="/messages/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Message
        </Link>
      </PageHeader>

      {isLoading && <Loading text="Loading messages..." />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && messages.length === 0 && (
        <EmptyState
          title="No messages"
          description="Your inbox is empty. Send a message to another user to start a conversation."
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
