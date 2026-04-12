"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, ApiResponse } from "@/types";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<ApiResponse<User>>("/auth/profile"),
  });
}
