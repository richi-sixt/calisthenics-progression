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
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["workouts"] });
      const previous = queryClient.getQueriesData<PaginatedResponse<Workout> | ApiResponse<Workout>>({
        queryKey: ["workouts"],
      });

      queryClient.setQueriesData<PaginatedResponse<Workout> | ApiResponse<Workout>>(
        { queryKey: ["workouts"] },
        (old) => {
          if (!old) return old;
          // useWorkouts (list) caches { data: Workout[] }; useWorkout (single) caches { data: Workout }.
          // Both share the "workouts" key prefix, so this has to handle both shapes.
          if (Array.isArray(old.data)) {
            return { ...old, data: old.data.map((w) => (w.id === id ? { ...w, is_done: !w.is_done } : w)) };
          }
          if (old.data.id === id) {
            return { ...old, data: { ...old.data, is_done: !old.data.is_done } };
          }
          return old;
        }
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/workouts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; exercises: unknown[] }) =>
      api.post<ApiResponse<Workout>>("/workouts", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; exercises?: unknown[] }) =>
      api.put<ApiResponse<Workout>>(`/workouts/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export { ApiError };
