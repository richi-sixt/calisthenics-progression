import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useExercises } from "@/hooks/use-exercises";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListPickerField } from "@/components/statistics/ListPickerField";
import { MarkdownField } from "@/components/ui/MarkdownField";
import type { SkillInput } from "@/hooks/use-skills";
import { useTranslation } from "@/i18n";
import type { Skill } from "@/types";

interface Row {
  exercise_id: number;
  title: string;
  counting_type: "reps" | "duration" | "km";
  target_value: string;
}

const inputClass =
  "rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm";

export function SkillForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  defaultValues?: Skill;
  onSubmit: (data: SkillInput) => void;
  isPending: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data } = useExercises(1, "mine", undefined, undefined, undefined, debouncedSearch);
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [rows, setRows] = useState<Row[]>(
    defaultValues?.exercises.map((e) => ({
      exercise_id: e.exercise_id,
      title: e.archived ? `${e.title} (${t("skills.archivedExercise")})` : e.title,
      counting_type: e.counting_type,
      target_value: String(e.target_value),
    })) ?? []
  );

  const candidates = useMemo(() => {
    const taken = new Set(rows.map((r) => r.exercise_id));
    return (data?.data ?? []).filter((e) => !taken.has(e.id) && e.counting_type !== "km");
  }, [data, rows]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setRows(next);
  };

  const add = (id: number) => {
    const exercise = candidates.find((e) => e.id === id);
    if (!exercise) return;
    setRows([
      ...rows,
      {
        exercise_id: exercise.id,
        title: exercise.title,
        counting_type: exercise.counting_type,
        target_value: exercise.counting_type === "duration" ? "10" : "8",
      },
    ]);
  };

  const targetsValid = rows.every((r) => Number(r.target_value) >= 1);
  const canSave = title.trim().length > 0 && targetsValid && !isPending;

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      exercises: rows.map((r) => ({ exercise_id: r.exercise_id, target_value: Number(r.target_value) })),
    });
  };

  return (
    <View className="gap-6">
      <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("skills.name")}</Text>
        <TextInput
          testID="skill-title"
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          placeholder={t("skills.namePlaceholder")}
          className={`mt-1 ${inputClass}`}
        />
      </View>

      <MarkdownField
        testID="skill-description"
        value={description}
        onChange={setDescription}
        label={t("skills.description")}
        placeholder={t("exerciseForm.descriptionPlaceholder")}
      />

      <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("skills.exercises")}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">{t("skills.exercisesHint")}</Text>

        <View className="mt-2 gap-2">
          {rows.map((row, index) => (
            <View
              key={row.exercise_id}
              testID={`skill-row-${row.exercise_id}`}
              className="rounded-md border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-800"
            >
              <View className="flex-row items-center gap-2">
                <Text className="w-5 text-center text-xs font-medium text-gray-700 dark:text-gray-300">{index + 1}</Text>
                <Text className="flex-1 text-sm text-gray-900 dark:text-gray-100" numberOfLines={1}>
                  {row.title}
                </Text>
                <Pressable onPress={() => move(index, index - 1)} disabled={index === 0} className="px-1.5" accessibilityLabel={t("exerciseForm.moveUp", { title: row.title })}>
                  <Text className={`text-base ${index === 0 ? "text-gray-300" : "text-gray-500"}`}>↑</Text>
                </Pressable>
                <Pressable
                  onPress={() => move(index, index + 1)}
                  disabled={index === rows.length - 1}
                  className="px-1.5"
                  accessibilityLabel={t("exerciseForm.moveDown", { title: row.title })}
                >
                  <Text className={`text-base ${index === rows.length - 1 ? "text-gray-300" : "text-gray-500"}`}>↓</Text>
                </Pressable>
                <Pressable onPress={() => setRows(rows.filter((r) => r.exercise_id !== row.exercise_id))}>
                  <Text className="text-sm text-red-400">{t("common.remove")}</Text>
                </Pressable>
              </View>
              <View className="mt-2 flex-row items-center gap-2">
                <TextInput
                  testID={`skill-target-${row.exercise_id}`}
                  value={row.target_value}
                  onChangeText={(v) => setRows(rows.map((r, i) => (i === index ? { ...r, target_value: v.replace(/[^0-9]/g, "") } : r)))}
                  keyboardType="number-pad"
                  accessibilityLabel={t("skills.targetLabel", { title: row.title })}
                  className={`w-24 ${inputClass} py-1`}
                />
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {row.counting_type === "duration" ? t("skills.targetSeconds") : t("skills.targetReps")}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="mt-3">
          <ListPickerField
            label={t("skills.addExercise")}
            placeholder={candidates.length === 0 ? t("skills.noCandidates") : t("skills.selectExercise")}
            value={null}
            items={candidates.map((e) => ({ id: String(e.id), label: e.title }))}
            onChange={(id) => id && add(Number(id))}
            searchable
            searchPlaceholder={t("workoutForm.searchExercisePlaceholder")}
            onSearchChange={setSearch}
            emptyText={t("skills.noCandidates")}
            testID="skill-add"
          />
        </View>
      </View>

      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}

      <Pressable
        testID="skill-save"
        onPress={submit}
        disabled={!canSave}
        className={`items-center rounded-md bg-blue-600 py-3 ${canSave ? "" : "opacity-50"}`}
      >
        {isPending ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">{t("skills.save")}</Text>}
      </Pressable>
    </View>
  );
}
