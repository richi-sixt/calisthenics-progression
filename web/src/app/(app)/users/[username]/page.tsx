"use client";

import { use } from "react";
import Link from "next/link";
import { useUserProfile } from "@/hooks/use-social";
import UserProfileHeader from "@/components/social/user-profile-header";
import ExploreWorkoutCard from "@/components/social/explore-workout-card";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
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

  const { user, workouts } = data.data;

  return (
    <div>
      <Link href="/explore" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.explore").toLowerCase() })}
      </Link>

      <div className="mt-4">
        <UserProfileHeader user={user} />
      </div>

      <div className="mt-6">
        {workouts.length === 0 ? (
          <EmptyState title={t("social.noWorkouts")} />
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => (
              <ExploreWorkoutCard key={w.id} workout={w} showOwner={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
