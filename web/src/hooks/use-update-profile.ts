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

export function useUploadProfilePicture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("picture", file);
      return api.upload<ApiResponse<User>>("/auth/profile/picture", formData);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () =>
      api.delete<ApiResponse<{ message: string }>>("/auth/account"),
  });
}
