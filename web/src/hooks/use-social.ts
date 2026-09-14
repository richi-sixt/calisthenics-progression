"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Workout,
  PaginatedResponse,
  UserProfileResponse,
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
    queryFn: () =>
      api.get<{ data: UserProfileResponse; meta: import("@/types").PaginationMeta }>(
        `/users/${username}`
      ),
  });
}

function invalidateFollowQueries(qc: ReturnType<typeof useQueryClient>, username: string) {
  qc.invalidateQueries({ queryKey: ["user", username] });
  qc.invalidateQueries({ queryKey: ["explore"] });
  qc.invalidateQueries({ queryKey: ["followers"] });
  qc.invalidateQueries({ queryKey: ["following"] });
  qc.invalidateQueries({ queryKey: ["follow-requests"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { follow_status: import("@/types").FollowStatus } }>(
        `/users/${username}/follow`
      ),
    onSuccess: (_data, username) => invalidateFollowQueries(qc, username),
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { follow_status: import("@/types").FollowStatus } }>(
        `/users/${username}/unfollow`
      ),
    onSuccess: (_data, username) => invalidateFollowQueries(qc, username),
  });
}

export function useFollowRequests(page: number = 1) {
  return useQuery({
    queryKey: ["follow-requests", page],
    queryFn: () =>
      api.get<PaginatedResponse<FollowUser>>("/follow-requests", {
        page: String(page),
      }),
  });
}

export function useAcceptFollowRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { message: string } }>(`/follow-requests/${username}/accept`),
    onSuccess: (_data, username) => invalidateFollowQueries(qc, username),
  });
}

export function useDenyFollowRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { message: string } }>(`/follow-requests/${username}/deny`),
    onSuccess: (_data, username) => invalidateFollowQueries(qc, username),
  });
}

export function useRemoveFollower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { message: string } }>(`/users/${username}/remove-follower`),
    onSuccess: (_data, username) => invalidateFollowQueries(qc, username),
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
