import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function LibraryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Library</Text>
      </View>
      <View className="px-4 gap-2">
        <Pressable
          onPress={() => router.push("/categories")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">Categories</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/exercises")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">Exercises</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/templates")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">Templates</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
