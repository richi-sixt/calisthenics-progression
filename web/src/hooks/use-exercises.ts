"use client";

import { keepPreviousData, useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ExerciseDefinition,
  ExerciseWorkoutRef,
  PaginatedResponse,
  ApiResponse,
  Visibility,
} from "@/types";

export function useExercises(
  page: number = 1,
  userFilter: string = "mine",
  categoryIds?: number[],
  username?: string,
  skillId?: number,
  search?: string
) {
  const params: Record<string, string> = {
    page: String(page),
    user: userFilter,
  };
  if (username) {
    params.username = username;
  }
  if (categoryIds && categoryIds.length > 0) {
    params.category = categoryIds.join(",");
  }
  if (skillId !== undefined) {
    params.skill = String(skillId);
  }
  if (search && search.trim()) {
    params.q = search.trim();
  }
  return useQuery({
    queryKey: ["exercises", page, userFilter, categoryIds, username, skillId, search?.trim() ?? ""],
    queryFn: () => api.get<PaginatedResponse<ExerciseDefinition>>("/exercises", params),
    // Keep showing the previous list while a new search/filter loads, so
    // forms that wait for the list don't unmount (and lose focus) mid-typing.
    placeholderData: keepPreviousData,
  });
}

/**
 * Load specific exercises by id (shares the cache with `useExercise`).
 * Used to keep already selected exercises available while a picker's list is
 * narrowed by a search.
 */
export function useExerciseDefs(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["exercises", id],
      queryFn: () => api.get<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`),
    })),
    combine: (results) => ({
      defs: results.flatMap((r) => (r.data ? [r.data.data] : [])),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}

export function useExercise(id: number | null) {
  return useQuery({
    queryKey: ["exercises", id],
    queryFn: () => api.get<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`),
    enabled: id != null,
  });
}

export function useExerciseWorkouts(id: number | null, limit: number = 10) {
  return useQuery({
    queryKey: ["exercises", id, "workouts", limit],
    queryFn: () =>
      api.get<ApiResponse<ExerciseWorkoutRef[]>>(`/exercises/${id}/workouts`, {
        limit: String(limit),
      }),
    enabled: id != null,
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      counting_type: string;
      visibility?: Visibility;
      progressions?: number[];
      category_ids?: number[];
      thumbnail?: string | null;
      is_catalog?: boolean;
    }) => api.post<ApiResponse<ExerciseDefinition>>("/exercises", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: unknown }) =>
      api.put<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useExerciseUsage(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["exercise-usage", id],
    queryFn: () =>
      api.get<ApiResponse<{ in_use: boolean; action: "archive" | "delete" }>>(
        `/exercises/${id}/usage`
      ),
    enabled,
    gcTime: 0,
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/exercises/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useCopyExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<ExerciseDefinition>>(`/exercises/${id}/copy`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
