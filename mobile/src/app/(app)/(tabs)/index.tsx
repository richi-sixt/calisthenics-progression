import { useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, Switch, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorkouts } from "@/hooks/use-workouts";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import type { Workout } from "@/types";

export default function WorkoutsScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [hideDone, setHideDone] = useState(false);
  const { data, isLoading, error, refetch, isRefetching } = useWorkouts(page, hideDone);

  const workouts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-4">
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-2xl font-bold">Workouts</Text>
          <Pressable
            onPress={() => router.push("/workouts/new")}
            className="rounded-md bg-blue-600 px-4 py-2"
          >
            <Text className="text-sm font-medium text-white">New</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 pb-3">
          <Switch
            value={hideDone}
            onValueChange={(value) => {
              setHideDone(value);
              setPage(1);
            }}
          />
          <Text className="text-sm text-gray-600">Hide completed</Text>
        </View>

        {isLoading && <ActivityIndicator className="mt-6" />}

        {error && (
          <Text className="mt-6 text-red-600">
            Failed to load workouts: {error instanceof Error ? error.message : String(error)}
          </Text>
        )}

        {!isLoading && !error && workouts.length === 0 && (
          <Text className="mt-6 text-gray-500">No workouts yet.</Text>
        )}
        
        <FlatList
          className="flex-1"
          data={workouts}
          keyExtractor={(item: Workout) => String(item.id)}
          renderItem={({ item }) => <WorkoutCard workout={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        />

        {meta && (meta.has_prev || meta.has_next) && (
          <View className="flex-row items-center justify-between py-4">
            <Pressable
              onPress={() => setPage((p) => p - 1)}
              disabled={!meta.has_prev}
              className="rounded-md bg-gray-100 px-4 py-2"
            >
              <Text className="text-sm font-medium text-gray-700">Previous</Text>
            </Pressable>
            <Text className="text-sm text-gray-500">
              Page {meta.page} of {Math.ceil(meta.total / meta.per_page)}
            </Text>
            <Pressable
              onPress={() => setPage((p) => p + 1)}
              disabled={!meta.has_next}
              className="rounded-md bg-gray-100 px-4 py-2"
            >
              <Text className="text-sm font-medium text-gray-700">Next</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
