import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExerciseCategory, CategoryGroup, ApiResponse } from "@/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiResponse<ExerciseCategory[]>>("/categories"),
  });
}

export function useCategoryGroups() {
  return useQuery({
    queryKey: ["category-groups"],
    queryFn: () => api.get<ApiResponse<CategoryGroup[]>>("/category-groups"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, group_id }: { name: string; group_id?: number | null }) =>
      api.post<ApiResponse<ExerciseCategory>>("/categories", { name, group_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      name?: string;
      group_id?: number | null;
    }) => api.put<ApiResponse<ExerciseCategory>>(`/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useCreateCategoryGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<ApiResponse<CategoryGroup>>("/category-groups", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category-groups"] }),
  });
}

export function useRenameCategoryGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.put<ApiResponse<CategoryGroup>>(`/category-groups/${id}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category-groups"] }),
  });
}

export function useDeleteCategoryGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/category-groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category-groups"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
