"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExerciseCategory, ApiResponse } from "@/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiResponse<ExerciseCategory[]>>("/categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<ApiResponse<ExerciseCategory>>("/categories", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
