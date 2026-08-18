import { View, Text, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import type { UserWithFollowing } from "@/types";
import { useFollow, useUnfollow } from "@/hooks/use-social";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

export function UserProfileHeader({ user }: { user: UserWithFollowing }) {
  const router = useRouter();
  const follow = useFollow();
  const unfollow = useUnfollow();

  const profilePicUrl = user.image_file ? `${API_BASE}/static/profile_pics/${user.image_file}` : null;

  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4">
      <View className="flex-row items-center gap-4">
        {profilePicUrl ? (
          <Image source={{ uri: profilePicUrl }} className="h-16 w-16 rounded-full" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-200">
            <Text className="text-xl font-bold text-gray-500">{user.username?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900">@{user.username}</Text>
          {user.about_me && <Text className="mt-1 text-sm text-gray-600">{user.about_me}</Text>}
          <View className="mt-2 flex-row items-center gap-4">
            <Text className="text-sm text-gray-500"><Text className="font-bold text-gray-900">{user.follower_count}</Text> followers</Text>
            <Text className="text-sm text-gray-500"><Text className="font-bold text-gray-900">{user.following_count}</Text> following</Text>
          </View>
          {user.last_seen && <Text className="mt-1 text-xs text-gray-400">Last seen {new Date(user.last_seen).toLocaleDateString()}</Text>}
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {user.is_following ? (
          <Pressable onPress={() => unfollow.mutate(user.username)} disabled={unfollow.isPending} className="rounded-md bg-gray-100 px-3 py-1.5">
            <Text className="text-xs font-medium text-gray-600">{unfollow.isPending ? "Unfollowing..." : "Unfollow"}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => follow.mutate(user.username)} disabled={follow.isPending} className="rounded-md bg-blue-50 px-3 py-1.5">
            <Text className="text-xs font-medium text-blue-600">{follow.isPending ? "Following..." : "Follow"}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push({ pathname: "/messages/new", params: { to: user.username } })}
          className="rounded-md bg-gray-100 px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-gray-600">Send message</Text>
        </Pressable>
      </View>
    </View>
  );
}
