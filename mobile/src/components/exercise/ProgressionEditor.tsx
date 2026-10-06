import { View, Text, Pressable } from "react-native";
import { useExercises } from "@/hooks/use-exercises";
import { ListPickerField } from "@/components/statistics/ListPickerField";
import { useTranslation } from "@/i18n";

export interface ProgressionItem {
  id: number;
  title: string;
}

/**
 * Ordered list of progression steps (child exercises): reorder with the
 * up/down buttons, remove, and add more of the user's own exercises.
 */
export function ProgressionEditor({
  value,
  onChange,
  excludeIds = [],
}: {
  value: ProgressionItem[];
  onChange: (next: ProgressionItem[]) => void;
  /** Exercises that must not be offered (the exercise itself, its parents). */
  excludeIds?: number[];
}) {
  const { t } = useTranslation();
  const { data } = useExercises(1, "mine");

  const taken = new Set([...value.map((v) => v.id), ...excludeIds]);
  const candidates = (data?.data ?? []).filter((e) => !taken.has(e.id));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = value.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <View>
      <Text className="text-xs text-gray-500 dark:text-gray-400">{t("exerciseForm.progressionsHintMobile")}</Text>
      <View className="mt-2 gap-2">
        {value.map((item, index) => (
          <View
            key={item.id}
            testID={`progression-row-${item.id}`}
            className="flex-row items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <View className="h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <Text className="text-xs font-medium text-gray-900 dark:text-gray-100">{index + 1}</Text>
            </View>
            <Text className="flex-1 text-sm text-gray-900 dark:text-gray-100" numberOfLines={1}>
              {item.title}
            </Text>
            <Pressable
              onPress={() => move(index, index - 1)}
              disabled={index === 0}
              hitSlop={6}
              testID={`progression-up-${item.id}`}
              accessibilityLabel={t("exerciseForm.moveUp", { title: item.title })}
              className={index === 0 ? "opacity-30" : ""}
            >
              <Text className="px-1.5 text-base text-gray-600 dark:text-gray-300">↑</Text>
            </Pressable>
            <Pressable
              onPress={() => move(index, index + 1)}
              disabled={index === value.length - 1}
              hitSlop={6}
              testID={`progression-down-${item.id}`}
              accessibilityLabel={t("exerciseForm.moveDown", { title: item.title })}
              className={index === value.length - 1 ? "opacity-30" : ""}
            >
              <Text className="px-1.5 text-base text-gray-600 dark:text-gray-300">↓</Text>
            </Pressable>
            <Pressable
              onPress={() => onChange(value.filter((v) => v.id !== item.id))}
              testID={`progression-remove-${item.id}`}
            >
              <Text className="text-sm text-red-400 dark:text-red-400">{t("common.remove")}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View className="mt-2">
        <ListPickerField
          label={t("exerciseForm.addProgression")}
          placeholder={candidates.length === 0 ? t("exerciseForm.noProgressionCandidates") : t("exerciseForm.selectProgression")}
          value={null}
          items={candidates.map((e) => ({ id: String(e.id), label: e.title }))}
          onChange={(id) => {
            const exercise = candidates.find((e) => String(e.id) === id);
            if (exercise) onChange([...value, { id: exercise.id, title: exercise.title }]);
          }}
          searchable
          emptyText={t("exerciseForm.noProgressionCandidates")}
          testID="progression-add"
        />
      </View>
    </View>
  );
}
