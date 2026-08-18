import { useState } from "react";
import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExplore } from "@/hooks/use-social";
import { ExploreWorkoutCard } from "@/components/social/ExploreWorkoutCard";
import type { Workout } from "@/types";

export default function ExploreScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useExplore(page);
  const workouts = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-4">
        <Text className="py-4 text-2xl font-bold">Explore</Text>

        {isLoading && <ActivityIndicator className="mt-6" />}
        {error && <Text className="mt-6 text-red-600">Failed to load.</Text>}
        {!isLoading && !error && workouts.length === 0 && <Text className="mt-6 text-gray-500">Nothing to explore yet.</Text>}

        <FlatList
          className="flex-1"
          data={workouts}
          keyExtractor={(item: Workout) => String(item.id)}
          renderItem={({ item }) => <ExploreWorkoutCard workout={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}
