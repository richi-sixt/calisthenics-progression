"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, ApiResponse } from "@/types";

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username?: string; about_me?: string }) =>
      api.put<ApiResponse<User>>("/auth/profile", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
