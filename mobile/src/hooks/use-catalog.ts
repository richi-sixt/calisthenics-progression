import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CatalogExercise,
  CatalogSkill,
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

export function useCatalogSkills(search: string = "") {
  const params: Record<string, string> = {};
  if (search.trim()) params.q = search.trim();
  return useQuery({
    queryKey: ["catalog", "skills", search.trim()],
    queryFn: () => api.get<ApiResponse<CatalogSkill[]>>("/catalog/skills", params),
  });
}

export function useImportCatalogSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ApiResponse<{ id: number; title: string }>>(`/catalog/skills/${id}/import`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
