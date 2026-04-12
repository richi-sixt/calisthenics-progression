"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workout, ApiResponse } from "@/types";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<ApiResponse<Workout[]>>("/templates"),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; exercises: unknown[] }) =>
      api.post<ApiResponse<Workout>>("/templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; exercises?: unknown[] }) =>
      api.put<ApiResponse<Workout>>(`/templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUseTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<Workout>>(`/templates/${id}/use`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}
