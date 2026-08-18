import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import type { Message } from "@/types";

export function MessageCard({ message }: { message: Message }) {
  const router = useRouter();
  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4">
      <View className="flex-row items-center gap-2">
        {message.sender_username && (
          <Pressable onPress={() => router.push(`/users/${message.sender_username}`)}>
            <Text className="text-sm font-semibold text-blue-600">@{message.sender_username}</Text>
          </Pressable>
        )}
        {message.timestamp && <Text className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleString()}</Text>}
      </View>
      <Text className="mt-1 text-sm text-gray-700">{message.body}</Text>
    </View>
  );
}
