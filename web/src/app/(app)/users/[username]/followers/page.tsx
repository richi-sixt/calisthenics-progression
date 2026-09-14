"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useFollowers } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import FollowUserList from "@/components/social/follow-user-list";
import PageHeader from "@/components/ui/page-header";
import { useTranslation } from "@/i18n";

export default function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { t } = useTranslation();
  const { username } = use(params);
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFollowers(username, page);
  const { data: profile } = useProfile();
  const isOwnProfile = profile?.data?.username === username;

  return (
    <div>
      <Link
        href={`/users/${username}`}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        &larr; @{username}
      </Link>
      <div className="mt-2">
        <PageHeader title={t("followList.followersTitle")} />
      </div>
      <FollowUserList
        data={data}
        isLoading={isLoading}
        error={error}
        onPageChange={setPage}
        mode={isOwnProfile ? "remove" : "follow"}
      />
    </div>
  );
}
