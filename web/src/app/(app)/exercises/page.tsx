"use client";

import { useState } from "react";
import Link from "next/link";
import { useExercises } from "@/hooks/use-exercises";
import ExerciseCard from "@/components/exercise/exercise-card";
import CategoryFilter from "@/components/exercise/category-filter";
import Pagination from "@/components/ui/pagination";
import PageHeader from "@/components/ui/page-header";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import EmptyState from "@/components/ui/empty-state";

export default function ExercisesPage() {
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState("mine");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const { data, isLoading, error } = useExercises(page, userFilter, categoryIds);

  const exercises = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader title="Exercises">
        <Link
          href="/exercises/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Exercise
        </Link>
      </PageHeader>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setUserFilter("mine"); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              userFilter === "mine" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            My Exercises
          </button>
          <button
            onClick={() => { setUserFilter("all"); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              userFilter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Exercises
          </button>
        </div>
      </div>

      <div className="mt-3">
        <CategoryFilter
          selectedIds={categoryIds}
          onChange={(ids) => { setCategoryIds(ids); setPage(1); }}
        />
      </div>

      {isLoading && <Loading text="Loading exercises..." />}
      {error && <ErrorMessage error={error} />}

      {!isLoading && !error && exercises.length === 0 && (
        <EmptyState
          title="No exercises yet"
          description="Create your first exercise definition to get started."
        />
      )}

      {exercises.length > 0 && (
        <div className="mt-4 space-y-3">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      )}

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
