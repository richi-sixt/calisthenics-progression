import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function LibraryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold">Library</Text>
      </View>
      <View className="px-4 gap-2">
        <Pressable
          onPress={() => router.push("/categories")}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <Text className="font-semibold text-gray-900">Categories</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/exercises")}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <Text className="font-semibold text-gray-900">Exercises</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/templates")}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <Text className="font-semibold text-gray-900">Templates</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
