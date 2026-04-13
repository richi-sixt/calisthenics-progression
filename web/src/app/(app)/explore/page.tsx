"use client";

import { useState } from "react";
import { useExplore } from "@/hooks/use-social";
import ExploreWorkoutCard from "@/components/social/explore-workout-card";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";
import { useTranslation } from "@/i18n";
import { CardListSkeleton, ExploreCardSkeleton } from "@/components/ui/skeleton";

export default function ExplorePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useExplore(page);
  const workouts = data?.data ?? [];

  return (
    <div>
      <PageHeader title={t("explore.title")} />

      {isLoading && <CardListSkeleton count={3} Card={ExploreCardSkeleton} />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && workouts.length === 0 && (
        <EmptyState
          title={t("explore.empty")}
          description={t("explore.emptyDescription")}
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
