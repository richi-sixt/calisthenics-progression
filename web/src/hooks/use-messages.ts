"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Message, PaginatedResponse, ApiResponse } from "@/types";

export function useMessages(page: number = 1) {
  return useQuery({
    queryKey: ["messages", page],
    queryFn: () => api.get<PaginatedResponse<Message>>("/messages", { page: String(page) }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipient, body }: { recipient: string; body: string }) =>
      api.post<ApiResponse<Message>>(`/messages/${recipient}`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });
}
