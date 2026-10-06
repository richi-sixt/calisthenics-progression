import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useExercise } from "@/hooks/use-exercises";
import { useTranslation } from "@/i18n";
import { Markdown } from "@/components/ui/Markdown";

export function ExercisePreviewModal({ exerciseId, onClose }: { exerciseId: number | null; onClose: () => void }) {
  // Mount the query only while open, so closed previews cost nothing.
  if (exerciseId == null) return null;
  return <PreviewContent exerciseId={exerciseId} onClose={onClose} />;
}

function PreviewContent({ exerciseId, onClose }: { exerciseId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useExercise(exerciseId);
  const exercise = data?.data;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>
            {exercise?.title ?? t("exercises.preview")}
          </Text>
          <Pressable onPress={onClose} testID="exercise-preview-close" hitSlop={8}>
            <Text className="text-base font-medium text-blue-600 dark:text-blue-400">{t("common.close")}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {isLoading && <ActivityIndicator />}
          {exercise && (
            <>
              <View className="self-start rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5">
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{exercise.counting_type}</Text>
              </View>
              {exercise.description ? (
                <Markdown className="mt-3" textClassName="text-gray-600 dark:text-gray-400">
                  {exercise.description}
                </Markdown>
              ) : null}
              {exercise.progressions.length > 0 && (
                <View className="mt-4 gap-1">
                  {exercise.progressions.map((step, index) => (
                    <View key={step.id} className="flex-row items-center gap-2">
                      <View className="h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                        <Text className="text-xs font-medium text-gray-900 dark:text-gray-100">{index + 1}</Text>
                      </View>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{step.title}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
