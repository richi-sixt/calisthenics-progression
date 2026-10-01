"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ReportTargetType = "user" | "workout" | "exercise" | "message";
export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "illegal"
  | "other";

export const REPORT_REASONS: ReportReason[] = [
  "spam",
  "harassment",
  "inappropriate",
  "illegal",
  "other",
];

export interface BlockedUser {
  id: number;
  username: string;
  image_file: string;
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ["blocks"],
    queryFn: () => api.get<{ data: BlockedUser[] }>("/blocks"),
  });
}

function invalidateAfterBlockChange(qc: ReturnType<typeof useQueryClient>) {
  for (const key of [
    "blocks",
    "user",
    "explore",
    "followers",
    "following",
    "follow-requests",
    "messages",
    "exercises",
    "notifications",
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.post<{ data: { blocked: boolean } }>(`/users/${username}/block`),
    onSuccess: () => invalidateAfterBlockChange(qc),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      api.delete<{ data: { blocked: boolean } }>(`/users/${username}/block`),
    onSuccess: () => invalidateAfterBlockChange(qc),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (body: {
      target_type: ReportTargetType;
      target_id: number;
      reason: ReportReason;
      details?: string;
    }) => api.post<{ data: { id: number; status: string } }>("/reports", body),
  });
}
