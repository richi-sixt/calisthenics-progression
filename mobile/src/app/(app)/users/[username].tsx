import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useUserProfile } from "@/hooks/use-social";
import { UserProfileHeader } from "@/components/social/UserProfileHeader";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data, isLoading, error } = useUserProfile(username);

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator /></View>;
  }
  if (error || !data) {
    return <View className="flex-1 items-center justify-center bg-white p-4"><Text className="text-red-600">Failed to load profile.</Text></View>;
  }

  const { user } = data.data;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      <UserProfileHeader user={user} />
    </ScrollView>
  );
}
