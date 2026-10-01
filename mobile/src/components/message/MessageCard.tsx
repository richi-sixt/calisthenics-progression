import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import type { Message } from "@/types";
import { ReportBlockMenu } from "@/components/social/ReportBlockMenu";
import { useTranslation } from "@/i18n";

export function MessageCard({ message }: { message: Message }) {
  const router = useRouter();
  const { formatDate } = useTranslation();
  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center gap-2">
        {message.sender_username && (
          <Pressable onPress={() => router.push(`/users/${message.sender_username}`)}>
            <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">@{message.sender_username}</Text>
          </Pressable>
        )}
        {message.timestamp && <Text className="text-xs text-gray-400 dark:text-gray-500">{formatDate(message.timestamp, "dateTime")}</Text>}
        {message.sender_username && (
          <View className="ml-auto">
            <ReportBlockMenu username={message.sender_username} targetType="message" targetId={message.id} />
          </View>
        )}
      </View>
      <Text className="mt-1 text-sm text-gray-700 dark:text-gray-300">{message.body}</Text>
    </View>
  );
}
