import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExerciseDefinition, PaginatedResponse, ApiResponse } from "@/types";

export function useExercises(page: number = 1, userFilter: string = "mine", categoryIds?: number[]) {
  const params: Record<string, string> = { page: String(page), user: userFilter };
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
