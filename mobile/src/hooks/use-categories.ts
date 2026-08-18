import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExerciseCategory, ApiResponse } from "@/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiResponse<ExerciseCategory[]>>("/categories"),
  });
}
