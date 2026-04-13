"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useUserProfile } from "@/hooks/use-social";
import UserProfileHeader from "@/components/social/user-profile-header";
import ExploreWorkoutCard from "@/components/social/explore-workout-card";
import Pagination from "@/components/ui/pagination";
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
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useUserProfile(username, page);

  if (isLoading) return <ProfileSkeleton />;
  if (error || !data) return <ErrorMessage error={error} />;

  const { user, workouts } = data.data;

  return (
    <div>
      <Link href="/explore" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.explore").toLowerCase() })}
      </Link>

      <div className="mt-4">
        <UserProfileHeader user={user} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("nav.workouts")}</h2>
        <Link
          href={`/messages/new?to=${username}`}
          className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {t("social.sendMessage")}
        </Link>
      </div>

      {workouts.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t("social.noWorkouts")}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {workouts.map((w) => (
            <ExploreWorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}

      {data.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
    </div>
  );
}
