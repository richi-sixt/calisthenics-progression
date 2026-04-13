"use client";

import type { UserWithFollowing } from "@/types";
import { useFollow, useUnfollow } from "@/hooks/use-social";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export default function UserProfileHeader({ user }: { user: UserWithFollowing }) {
  const follow = useFollow();
  const unfollow = useUnfollow();

  const profilePicUrl = user.image_file
    ? `${API_BASE}/static/profile_pics/${user.image_file}`
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt={user.username}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-bold text-gray-500">
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">@{user.username}</h1>
            {user.about_me && (
              <p className="mt-2 text-sm text-gray-600">{user.about_me}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span>
                <strong className="text-gray-900">{user.follower_count}</strong>{" "}
                {user.follower_count === 1 ? "follower" : "followers"}
              </span>
              <span>
                <strong className="text-gray-900">{user.following_count}</strong>{" "}
                following
              </span>
            </div>
            {user.last_seen && (
              <p className="mt-1 text-xs text-gray-400">
                Last seen: {new Date(user.last_seen).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          {user.is_following ? (
            <button
              onClick={() => unfollow.mutate(user.username)}
              disabled={unfollow.isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {unfollow.isPending ? "Unfollowing..." : "Unfollow"}
            </button>
          ) : (
            <button
              onClick={() => follow.mutate(user.username)}
              disabled={follow.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {follow.isPending ? "Following..." : "Follow"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
