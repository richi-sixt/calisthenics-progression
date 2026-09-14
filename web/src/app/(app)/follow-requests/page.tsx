"use client";

import { useState } from "react";
import { useFollowRequests } from "@/hooks/use-social";
import FollowUserList from "@/components/social/follow-user-list";
import PageHeader from "@/components/ui/page-header";
import { useTranslation } from "@/i18n";

export default function FollowRequestsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFollowRequests(page);

  return (
    <div>
      <PageHeader title={t("followRequests.title")} />
      <FollowUserList
        data={data}
        isLoading={isLoading}
        error={error}
        onPageChange={setPage}
        mode="requests"
      />
    </div>
  );
}
