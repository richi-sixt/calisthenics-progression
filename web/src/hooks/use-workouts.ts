"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Workout, PaginatedResponse, ApiResponse, Visibility } from "@/types";

export function useWorkouts(
  page: number = 1,
  hideDone: boolean = false,
  date: string | null = null
) {
  return useQuery({
    queryKey: ["workouts", page, hideDone, date],
    queryFn: () =>
      api.get<PaginatedResponse<Workout>>("/workouts", {
        page: String(page),
        hide_done: hideDone ? "1" : "0",
        ...(date ? { date } : {}),
      }),
  });
}

export function useWorkoutsCalendar(month: string) {
  return useQuery({
    queryKey: ["workouts", "calendar", month],
    queryFn: () => api.get<ApiResponse<string[]>>("/workouts/calendar", { month }),
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

export function useCreateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      exercises: unknown[];
      visibility?: Visibility;
      planned_date?: string | null;
    }) => api.post<ApiResponse<Workout>>("/workouts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      title?: string;
      exercises?: unknown[];
      visibility?: Visibility;
      planned_date?: string | null;
    }) => api.put<ApiResponse<Workout>>(`/workouts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["explore"] });
    },
  });
}

export { ApiError };
