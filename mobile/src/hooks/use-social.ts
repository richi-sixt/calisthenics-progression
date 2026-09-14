import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Workout,
  PaginatedResponse,
  UserProfileResponse,
  PaginationMeta,
  FollowUser,
} from "@/types";

export interface ExploreFilters {
  scope?: "all" | "following";
  username?: string;
}

export function useExplore(page: number = 1, filters: ExploreFilters = {}) {
  const { scope, username } = filters;
  return useQuery({
    queryKey: ["explore", page, scope, username],
    queryFn: () =>
      api.get<PaginatedResponse<Workout>>("/explore", {
        page: String(page),
        ...(scope ? { scope } : {}),
        ...(username ? { username } : {}),
      }),
  });
}

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: ["user", username],
    queryFn: () => api.get<{ data: UserProfileResponse; meta: PaginationMeta }>(`/users/${username}`),
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => api.post<{ data: { message: string } }>(`/users/${username}/follow`),
    onSuccess: (_data, username) => {
      qc.invalidateQueries({ queryKey: ["user", username] });
      qc.invalidateQueries({ queryKey: ["explore"] });
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["following"] });
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => api.post<{ data: { message: string } }>(`/users/${username}/unfollow`),
    onSuccess: (_data, username) => {
      qc.invalidateQueries({ queryKey: ["user", username] });
      qc.invalidateQueries({ queryKey: ["explore"] });
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["following"] });
    },
  });
}

export function useFollowers(username: string, page: number = 1) {
  return useQuery({
    queryKey: ["followers", username, page],
    queryFn: () =>
      api.get<PaginatedResponse<FollowUser>>(`/users/${username}/followers`, {
        page: String(page),
      }),
    enabled: !!username,
  });
}

export function useFollowing(username: string, page: number = 1) {
  return useQuery({
    queryKey: ["following", username, page],
    queryFn: () =>
      api.get<PaginatedResponse<FollowUser>>(`/users/${username}/following`, {
        page: String(page),
      }),
    enabled: !!username,
  });
}
