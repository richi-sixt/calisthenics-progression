"use client";

import { use } from "react";
import Link from "next/link";
import { useUserProfile } from "@/hooks/use-social";
import UserProfileHeader from "@/components/social/user-profile-header";
import ErrorMessage from "@/components/ui/error-message";
import { useTranslation } from "@/i18n";
import { ProfileSkeleton } from "@/components/ui/skeleton";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { t } = useTranslation();
  const { username } = use(params);
  const { data, isLoading, error } = useUserProfile(username);

  if (isLoading) return <ProfileSkeleton />;
  if (error || !data) return <ErrorMessage error={error} />;

  const { user } = data.data;

  return (
    <div>
      <Link href="/explore" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.explore").toLowerCase() })}
      </Link>

      <div className="mt-4">
        <UserProfileHeader user={user} />
      </div>
    </div>
  );
}
