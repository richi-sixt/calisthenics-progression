"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { Message } from "@/types";

export default function MessageCard({ message }: { message: Message }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {message.sender_username && (
              <Link
                href={`/users/${message.sender_username}`}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                @{message.sender_username}
              </Link>
            )}
            {message.timestamp && (
              <span className="text-xs text-gray-400">
                {format(new Date(message.timestamp), "MMM d, yyyy 'at' HH:mm")}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {message.body}
          </p>
        </div>
      </div>
    </div>
  );
}
