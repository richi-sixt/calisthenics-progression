import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMessages } from "@/hooks/use-messages";
import { MessageCard } from "@/components/message/MessageCard";
import type { Message } from "@/types";

export default function MessagesScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch, isRefetching } = useMessages(page);
  const messages = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <View className="flex-1 px-4">
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Messages</Text>
          <Pressable onPress={() => router.push("/messages/new")} className="rounded-md bg-blue-600 px-4 py-2">
            <Text className="text-sm font-medium text-white">New</Text>
          </Pressable>
        </View>

        {isLoading && <ActivityIndicator className="mt-6" />}
        {error && <Text className="mt-6 text-red-600 dark:text-red-400">Failed to load messages.</Text>}
        {!isLoading && !error && messages.length === 0 && <Text className="mt-6 text-gray-500 dark:text-gray-400">No messages yet.</Text>}

        <FlatList
          className="flex-1"
          data={messages}
          keyExtractor={(item: Message) => String(item.id)}
          renderItem={({ item }) => <MessageCard message={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        />
      </View>
      {data?.meta && (data.meta.has_prev || data.meta.has_next) && (
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={() => setPage((p) => p - 1)} disabled={!data.meta.has_prev} className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous</Text>
          </Pressable>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Page {data.meta.page} of {Math.ceil(data.meta.total / data.meta.per_page)}
          </Text>
          <Pressable onPress={() => setPage((p) => p + 1)} disabled={!data.meta.has_next} className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Next</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
