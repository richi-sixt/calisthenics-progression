import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CatalogExercise,
  ExerciseDefinition,
  PaginatedResponse,
  ApiResponse,
} from "@/types";

export function useCatalogExercises(page: number = 1, search: string = "") {
  const params: Record<string, string> = { page: String(page) };
  if (search.trim()) params.q = search.trim();
  return useQuery({
    queryKey: ["catalog", page, search.trim()],
    queryFn: () =>
      api.get<PaginatedResponse<CatalogExercise>>("/catalog/exercises", params),
  });
}

export function useImportCatalogExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<ExerciseDefinition>>(`/catalog/exercises/${id}/import`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
