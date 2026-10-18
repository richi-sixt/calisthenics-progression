import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "@/i18n";

export default function LibraryScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("nav.library")}</Text>
      </View>
      <View className="px-4 gap-2">
        <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">{t("nav.libraryMine")}</Text>
        <Pressable
          onPress={() => router.push("/categories")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("nav.categories")}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/skills")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("nav.skills")}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/exercises")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("nav.exercises")}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/templates")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("nav.templates")}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/statistics")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("nav.statistics")}</Text>
        </Pressable>

        <Text className="mt-4 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">{t("nav.libraryApp")}</Text>
        <Pressable
          testID="library-catalog-exercises"
          onPress={() => router.push("/catalog")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("nav.catalogExercises")}</Text>
        </Pressable>
        <Pressable
          testID="library-catalog-skills"
          onPress={() => router.push({ pathname: "/catalog", params: { tab: "skills" } })}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("nav.catalogSkills")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
