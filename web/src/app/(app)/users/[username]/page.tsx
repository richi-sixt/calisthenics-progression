"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useUserProfile } from "@/hooks/use-social";
import UserProfileHeader from "@/components/social/user-profile-header";
import ExploreWorkoutCard from "@/components/social/explore-workout-card";
import Pagination from "@/components/ui/pagination";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useUserProfile(username, page);

  if (isLoading) return <Loading text="Loading profile..." />;
  if (error || !data) return <ErrorMessage error={error} />;

  const { user, workouts } = data.data;

  return (
    <div>
      <Link href="/explore" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to explore
      </Link>

      <div className="mt-4">
        <UserProfileHeader user={user} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Workouts</h2>
        <Link
          href={`/messages/new?to=${username}`}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          Send Message
        </Link>
      </div>

      {workouts.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No workouts yet.</p>
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
