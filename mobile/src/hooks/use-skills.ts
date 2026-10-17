import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Skill, ApiResponse } from "@/types";

export interface SkillInput {
  title: string;
  description?: string | null;
  /** Admin only: create an app-library skill. */
  is_catalog?: boolean;
  exercises: { exercise_id: number; target_value: number }[];
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => api.get<ApiResponse<Skill[]>>("/skills"),
  });
}

export function useSkill(id: number | null) {
  return useQuery({
    queryKey: ["skills", id],
    queryFn: () => api.get<ApiResponse<Skill>>(`/skills/${id}`),
    enabled: id != null,
  });
}

function useInvalidateSkills() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["skills"] });
    qc.invalidateQueries({ queryKey: ["exercises"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
}

export function useCreateSkill() {
  const invalidate = useInvalidateSkills();
  return useMutation({
    mutationFn: (data: SkillInput) => api.post<ApiResponse<Skill>>("/skills", data),
    onSuccess: invalidate,
  });
}

export function useUpdateSkill() {
  const invalidate = useInvalidateSkills();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<SkillInput>) =>
      api.put<ApiResponse<Skill>>(`/skills/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSkill() {
  const invalidate = useInvalidateSkills();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<ApiResponse<{ message: string }>>(`/skills/${id}`),
    onSuccess: invalidate,
  });
}
