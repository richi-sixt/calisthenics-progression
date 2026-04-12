"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Workout, PaginatedResponse, ApiResponse } from "@/types";

export function useWorkouts(page: number = 1, hideDone: boolean = false) {
  return useQuery({
    queryKey: ["workouts", page, hideDone],
    queryFn: () =>
      api.get<PaginatedResponse<Workout>>("/workouts", {
        page: String(page),
        hide_done: hideDone ? "1" : "0",
      }),
  });
}

export function useWorkout(id: number) {
  return useQuery({
    queryKey: ["workouts", id],
    queryFn: () => api.get<ApiResponse<Workout>>(`/workouts/${id}`),
  });
}

export function useToggleDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<Workout>>(`/workouts/${id}/toggle-done`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/workouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

export { ApiError };
