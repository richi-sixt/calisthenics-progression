"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workout, PaginatedResponse, UserProfileResponse } from "@/types";

export function useExplore(page: number = 1) {
  return useQuery({
    queryKey: ["explore", page],
    queryFn: () => api.get<PaginatedResponse<Workout>>("/explore", { page: String(page) }),
  });
}

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: ["user", username],
    queryFn: () =>
      api.get<{ data: UserProfileResponse; meta: import("@/types").PaginationMeta }>(
        `/users/${username}`
      ),
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { message: string } }>(`/users/${username}/follow`),
    onSuccess: (_data, username) => {
      qc.invalidateQueries({ queryKey: ["user", username] });
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { message: string } }>(`/users/${username}/unfollow`),
    onSuccess: (_data, username) => {
      qc.invalidateQueries({ queryKey: ["user", username] });
    },
  });
}
