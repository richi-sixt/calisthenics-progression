import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useUserProfile } from "@/hooks/use-social";
import { UserProfileHeader } from "@/components/social/UserProfileHeader";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data, isLoading, error } = useUserProfile(username);

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-4"><Text className="text-red-600 dark:text-red-400">Failed to load profile.</Text></View>;
  }

  const { user } = data.data;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <UserProfileHeader user={user} />
    </ScrollView>
  );
}
