import { keepPreviousData, useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { api } from "@/lib/api";
import { useTranslation } from "@/i18n";
import type { ExerciseDefinition, ExerciseWorkoutRef, PaginatedResponse, ApiResponse, Visibility } from "@/types";

export function useExercises(
  page: number = 1,
  userFilter: string = "mine",
  categoryIds?: number[],
  username?: string,
  skillId?: number,
  search?: string
) {
  const params: Record<string, string> = { page: String(page), user: userFilter };
  if (username) params.username = username;
  if (categoryIds && categoryIds.length > 0) {
    params.category = categoryIds.join(",");
  }
  if (skillId !== undefined) params.skill = String(skillId);
  if (search && search.trim()) params.q = search.trim();
  return useQuery({
    queryKey: ["exercises", page, userFilter, categoryIds, username, skillId, search?.trim() ?? ""],
    queryFn: () => api.get<PaginatedResponse<ExerciseDefinition>>("/exercises", params),
    // Keep showing the previous list while a new search/filter loads.
    placeholderData: keepPreviousData,
  });
}

/**
 * Load specific exercises by id (shares the cache with `useExercise`), so
 * already selected exercises stay known while a picker's list is searched.
 */
export function useExerciseDefs(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["exercises", id],
      queryFn: () => api.get<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`),
    })),
    combine: (results) => ({
      defs: results.flatMap((r) => (r.data ? [r.data.data] : [])),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}

export function useExercise(id: number | null) {
  return useQuery({
    queryKey: ["exercises", id],
    queryFn: () => api.get<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`),
    enabled: id != null,
  });
}

export function useExerciseWorkouts(id: number | null, limit: number = 10) {
  return useQuery({
    queryKey: ["exercises", id, "workouts", limit],
    queryFn: () =>
      api.get<ApiResponse<ExerciseWorkoutRef[]>>(`/exercises/${id}/workouts`, { limit: String(limit) }),
    enabled: id != null,
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      counting_type: string;
      visibility?: Visibility;
      progressions?: number[];
      category_ids?: number[];
      thumbnail?: string | null;
    }) => api.post<ApiResponse<ExerciseDefinition>>("/exercises", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: unknown }) =>
      api.put<ApiResponse<ExerciseDefinition>>(`/exercises/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useExerciseUsage(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["exercise-usage", id],
    queryFn: () =>
      api.get<ApiResponse<{ in_use: boolean; action: "archive" | "delete" }>>(`/exercises/${id}/usage`),
    enabled,
    gcTime: 0,
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<{ message: string }>>(`/exercises/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

/** Asks the server whether the exercise gets deleted or archived, tells the user, then removes it. */
export function useRemoveExercise() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const deleteExercise = useDeleteExercise();

  const remove = async (id: number, onDone?: () => void) => {
    let action: "archive" | "delete" = "archive";
    try {
      const res = await qc.fetchQuery({
        queryKey: ["exercise-usage", id],
        queryFn: () =>
          api.get<ApiResponse<{ in_use: boolean; action: "archive" | "delete" }>>(`/exercises/${id}/usage`),
        staleTime: 0,
      });
      action = res.data.action;
    } catch {
      // Server decides on DELETE anyway; fall back to the safer wording.
    }
    const isDelete = action === "delete";
    Alert.alert(
      t(isDelete ? "exercises.deleteConfirmTitle" : "exercises.archiveConfirmTitle"),
      t(isDelete ? "exercises.deleteConfirmMessage" : "exercises.archiveConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t(isDelete ? "exercises.delete" : "exercises.archive"),
          style: "destructive",
          onPress: () => deleteExercise.mutate(id, { onSuccess: onDone }),
        },
      ]
    );
  };

  return { remove, isPending: deleteExercise.isPending };
}

export function useCopyExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<ApiResponse<ExerciseDefinition>>(`/exercises/${id}/copy`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}
