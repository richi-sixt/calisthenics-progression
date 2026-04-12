"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExerciseDefinition, PaginatedResponse, ApiResponse } from "@/types";

export function useExercises(
  page: number = 1,
  userFilter: string = "mine",
  categoryIds?: number[]
) {
  const params: Record<string, string> = {
    page: String(page),
    user: userFilter,
  };
  if (categoryIds && categoryIds.length > 0) {
    params.category = categoryIds.join(",");
  }
  return useQuery({
    queryKey: ["exercises", page, userFilter, categoryIds],
    queryFn: () => api.get<PaginatedResponse<ExerciseDefinition>>("/exercises", params),
  });
}

export function useExercise(id: number) {
  return useQuery({
    queryKey: ["exercises", id],
    queryFn: () => api.get<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      counting_type: string;
      progression_levels?: string[];
      category_ids?: number[];
    }) => api.post<ApiResponse<ExerciseDefinition>>("/exercises", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: unknown }) =>
      api.put<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/exercises/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useCopyExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<ExerciseDefinition>>(`/exercises/${id}/copy`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}
