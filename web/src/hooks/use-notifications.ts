"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Notification, ApiResponse } from "@/types";

export function useNotifications(since: number = 0) {
  return useQuery({
    queryKey: ["notifications", since],
    queryFn: () =>
      api.get<ApiResponse<Notification[]>>("/notifications", {
        since: String(since),
      }),
    refetchInterval: 30_000,
  });
}

export function useUnreadMessageCount() {
  const { data } = useNotifications();
  const notifications = data?.data ?? [];
  const unread = notifications.find((n) => n.name === "unread_message_count");
  if (!unread?.data) return 0;
  return typeof unread.data === "number" ? unread.data : 0;
}
