import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMessages } from "@/hooks/use-messages";
import { MessageCard } from "@/components/message/MessageCard";
import type { Message } from "@/types";

export default function MessagesScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useMessages(page);
  const messages = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-4">
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-2xl font-bold">Messages</Text>
          <Pressable onPress={() => router.push("/messages/new")} className="rounded-md bg-blue-600 px-4 py-2">
            <Text className="text-sm font-medium text-white">New</Text>
          </Pressable>
        </View>

        {isLoading && <ActivityIndicator className="mt-6" />}
        {error && <Text className="mt-6 text-red-600">Failed to load messages.</Text>}
        {!isLoading && !error && messages.length === 0 && <Text className="mt-6 text-gray-500">No messages yet.</Text>}

        <FlatList
          className="flex-1"
          data={messages}
          keyExtractor={(item: Message) => String(item.id)}
          renderItem={({ item }) => <MessageCard message={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}
