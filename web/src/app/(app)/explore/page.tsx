"use client";

import { useState } from "react";
import { useExplore } from "@/hooks/use-social";
import ExploreWorkoutCard from "@/components/social/explore-workout-card";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";

export default function ExplorePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useExplore(page);
  const workouts = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Explore" />

      {isLoading && <Loading text="Loading workouts..." />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && workouts.length === 0 && (
        <EmptyState
          title="Nothing here yet"
          description="Follow other users to see their workouts in your explore feed."
        />
      )}

      {workouts.length > 0 && (
        <div className="mt-4 space-y-3">
          {workouts.map((w) => (
            <ExploreWorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}

      {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
    </div>
  );
}
