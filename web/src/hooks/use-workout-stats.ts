"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ApiResponse,
  ExerciseStatsResponse,
  StatsGranularity,
  WorkoutStatsResponse,
} from "@/types";

export function useExerciseStats(
  exerciseId: number | null,
  from: string,
  to: string,
  granularity: StatsGranularity = "month",
  progression: string | null = null
) {
  return useQuery({
    queryKey: ["stats", "exercise", exerciseId, from, to, granularity, progression],
    queryFn: () =>
      api.get<ApiResponse<ExerciseStatsResponse>>(`/exercises/${exerciseId}/stats`, {
        from,
        to,
        granularity,
        ...(progression ? { progression } : {}),
      }),
    enabled: exerciseId != null,
  });
}

export function useWorkoutStats(
  from: string,
  to: string,
  granularity: StatsGranularity = "month",
  categoryId: number | null = null
) {
  return useQuery({
    queryKey: ["stats", "workouts", from, to, granularity, categoryId],
    queryFn: () =>
      api.get<ApiResponse<WorkoutStatsResponse>>("/workouts/stats", {
        from,
        to,
        granularity,
        ...(categoryId != null ? { category: String(categoryId) } : {}),
      }),
  });
}
