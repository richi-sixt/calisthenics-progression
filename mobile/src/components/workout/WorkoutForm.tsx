import { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch, Modal, FlatList } from "react-native";
import { useForm, useFieldArray, useWatch, Controller, type Control } from "react-hook-form";
import { useExercises } from "@/hooks/use-exercises";
import { useCategories } from "@/hooks/use-categories";
import { useTranslation, type TranslationKey } from "@/i18n";
import type { Workout, ExerciseDefinition } from "@/types";

function secondsToMmss(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(1, "0")}:${String(secs).padStart(2, "0")}`;
}

function mmssToSeconds(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const mins = Number(match[1]);
  const secs = Number(match[2]);
  if (secs >= 60) return null;
  return mins * 60 + secs;
}

interface SetData {
  progression: string;
  reps: string;
  duration: string;
}

interface ExerciseData {
  exercise_definition_id: string;
  sets: SetData[];
}

interface WorkoutFormData {
  title: string;
  exercises: ExerciseData[];
}

export function WorkoutForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
}: {
  defaultValues?: Partial<Workout>;
  onSubmit: (data: { title: string; exercises: unknown[] }) => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  const { t } = useTranslation();
  const [showOnlyMine, setShowOnlyMine] = useState(true);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);

  const userFilter = showOnlyMine ? "mine" : "all";
  const { data: exData } = useExercises(1, userFilter, selectedCatIds.length > 0 ? selectedCatIds : undefined);
  const exerciseDefs = exData?.data ?? [];

  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  const { handleSubmit, control } = useForm<WorkoutFormData>({
    defaultValues: {
      title: defaultValues?.title ?? "",
      exercises:
        defaultValues?.exercises?.map((ex) => ({
          exercise_definition_id: String(ex.exercise_definition_id ?? ""),
          sets:
            ex.sets?.map((s) => ({
              progression: s.progression ?? "",
              reps: s.reps != null ? String(s.reps) : "",
              duration: s.duration != null ? secondsToMmss(s.duration) : "",
            })) ?? [{ progression: "", reps: "", duration: "" }],
        })) ?? [
          { exercise_definition_id: "", sets: [{ progression: "", reps: "", duration: "" }] },
        ],
    },
  });

  const {
    fields: exerciseFields,
    append: appendExercise,
    remove: removeExercise,
  } = useFieldArray({ control, name: "exercises" });

  const exerciseDefMap = useMemo(() => {
    const map = new Map<number, ExerciseDefinition>();
    for (const def of exerciseDefs) map.set(def.id, def);
    return map;
  }, [exerciseDefs]);

  const toggleCategory = (catId: number) => {
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const submit = (data: WorkoutFormData) => {
    onSubmit({
      title: data.title,
      exercises: data.exercises.map((ex) => ({
        exercise_definition_id: Number(ex.exercise_definition_id),
        sets: ex.sets.map((s) => ({
          progression: s.progression || null,
          reps: s.reps ? Number(s.reps) : null,
          duration: s.duration ? mmssToSeconds(s.duration) : null,
        })),
      })),
    });
  };

  return (
    <View className="gap-6">
      <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("workoutForm.title")}</Text>
        <Controller
          control={control}
          name="title"
          rules={{ required: true }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
              placeholder={t("workoutForm.titlePlaceholder")}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Switch value={showOnlyMine} onValueChange={setShowOnlyMine} />
          <Text className="text-sm text-gray-600 dark:text-gray-400">{t("workoutForm.showOnlyMine")}</Text>
        </View>

        {categories.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                className={`rounded-full px-2.5 py-1 ${selectedCatIds.includes(cat.id) ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
              >
                <Text className={`text-xs font-medium ${selectedCatIds.includes(cat.id) ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
            {selectedCatIds.length > 0 && (
              <Pressable onPress={() => setSelectedCatIds([])} className="px-2.5 py-1">
                <Text className="text-xs font-medium text-gray-400 dark:text-gray-500">{t("common.clear")}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View className="gap-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("workoutForm.exercises")}</Text>
        {exerciseFields.map((field, exIndex) => (
          <ExerciseBlock
            key={field.id}
            exIndex={exIndex}
            control={control}
            exerciseDefs={exerciseDefs}
            exerciseDefMap={exerciseDefMap}
            onRemove={() => removeExercise(exIndex)}
          />
        ))}
        <Pressable
          onPress={() =>
            appendExercise({ exercise_definition_id: "", sets: [{ progression: "", reps: "", duration: "" }] })
          }
        >
          <Text className="text-sm text-blue-600 dark:text-blue-400">{t("workoutForm.addExercise")}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleSubmit(submit)}
        disabled={isPending}
        className="items-center rounded-md bg-blue-600 py-3"
      >
        {isPending ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">{submitLabel ?? t("workoutForm.save")}</Text>}
      </Pressable>
    </View>
  );
}

function ExerciseBlock({
  exIndex,
  control,
  exerciseDefs,
  exerciseDefMap,
  onRemove,
}: {
  exIndex: number;
  control: Control<WorkoutFormData>;
  exerciseDefs: ExerciseDefinition[];
  exerciseDefMap: Map<number, ExerciseDefinition>;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const {
    fields: setFields,
    append: appendSet,
    remove: removeSet,
  } = useFieldArray({ control, name: `exercises.${exIndex}.sets` });

  const selectedDefId = useWatch({ control, name: `exercises.${exIndex}.exercise_definition_id` });
  const selectedDef = selectedDefId ? exerciseDefMap.get(Number(selectedDefId)) : undefined;
  const countingType = selectedDef?.counting_type ?? "reps";
  const progressionLevels = selectedDef?.progression_levels ?? [];
  const hasProgressionLevels = progressionLevels.length > 0;

  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
      <View className="flex-row items-center gap-2">
        <Controller
          control={control}
          name={`exercises.${exIndex}.exercise_definition_id`}
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <ExercisePickerField
              value={value}
              onChange={onChange}
              exerciseDefs={exerciseDefs}
              exerciseDefMap={exerciseDefMap}
              testID={`exercise-picker-${exIndex}`}
            />
          )}
        />
        <Pressable onPress={onRemove} testID={`exercise-remove-${exIndex}`}>
          <Text className="text-sm text-red-500 dark:text-red-400">{t("common.remove")}</Text>
        </Pressable>
      </View>

      <View className="mt-3 gap-2">
        {setFields.map((setField, setIndex) => (
          <View key={setField.id} className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("workouts.set")} {setIndex + 1}</Text>
              <Pressable onPress={() => removeSet(setIndex)} testID={`set-remove-${exIndex}-${setIndex}`}>
                <Text className="text-xs text-red-400 dark:text-red-400">{t("common.remove")}</Text>
              </Pressable>
            </View>

            {hasProgressionLevels && (
              <View className="mb-2">
                <Controller
                  control={control}
                  name={`exercises.${exIndex}.sets.${setIndex}.progression`}
                  render={({ field: { onChange, value } }) => (
                    <View
                      className="flex-row flex-wrap gap-1.5"
                      testID={`progression-chips-${exIndex}-${setIndex}`}
                    >
                      <Pressable
                        onPress={() => onChange("")}
                        testID={`progression-chip-${exIndex}-${setIndex}-none`}
                        className={`rounded-full px-2.5 py-1 ${value === "" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
                      >
                        <Text
                          className={`text-xs font-medium ${value === "" ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
                        >
                          ---
                        </Text>
                      </Pressable>
                      {progressionLevels.map((level) => (
                        <Pressable
                          key={level.id}
                          onPress={() => onChange(level.name)}
                          testID={`progression-chip-${exIndex}-${setIndex}-${level.id}`}
                          className={`rounded-full px-2.5 py-1 ${value === level.name ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
                        >
                          <Text
                            className={`text-xs font-medium ${value === level.name ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
                          >
                            {level.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                />
              </View>
            )}

            <View className="flex-row gap-2">
              {!hasProgressionLevels && (
                <Controller
                  control={control}
                  name={`exercises.${exIndex}.sets.${setIndex}.progression`}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm"
                      placeholder="e.g. Standard"
                      onChangeText={onChange}
                      value={value}
                      testID={`progression-input-${exIndex}-${setIndex}`}
                    />
                  )}
                />
              )}

              {countingType === "duration" ? (
                <Controller
                  control={control}
                  name={`exercises.${exIndex}.sets.${setIndex}.duration`}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm"
                      placeholder="0:00"
                      onChangeText={onChange}
                      value={value}
                      testID={`duration-${exIndex}-${setIndex}`}
                    />
                  )}
                />
              ) : (
                <Controller
                  control={control}
                  name={`exercises.${exIndex}.sets.${setIndex}.reps`}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm"
                      placeholder="0"
                      keyboardType="number-pad"
                      onChangeText={onChange}
                      value={value}
                      testID={`reps-${exIndex}-${setIndex}`}
                    />
                  )}
                />
              )}
            </View>
          </View>
        ))}
        <Pressable onPress={() => appendSet({ progression: "", reps: "", duration: "" })} testID={`add-set-${exIndex}`}>
          <Text className="text-xs text-blue-600 dark:text-blue-400">{t("workoutForm.addSet")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExercisePickerField({
  value,
  onChange,
  exerciseDefs,
  exerciseDefMap,
  testID,
}: {
  value: string;
  onChange: (id: string) => void;
  exerciseDefs: ExerciseDefinition[];
  exerciseDefMap: Map<number, ExerciseDefinition>;
  testID: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedDef = value ? exerciseDefMap.get(Number(value)) : undefined;

  const filteredDefs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? exerciseDefs.filter((def) => def.title.toLowerCase().includes(query)) : exerciseDefs;
  }, [exerciseDefs, search]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        testID={testID}
        className="flex-1 flex-row items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5"
      >
        <Text
          numberOfLines={1}
          className={`flex-1 text-sm ${selectedDef ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}
        >
          {selectedDef ? selectedDef.title : t("workoutForm.selectExercise")}
        </Text>
        <Text className="ml-2 text-gray-400 dark:text-gray-500">▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View className="flex-1 bg-white dark:bg-gray-900 pt-4">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("workoutForm.selectExercise")}
            </Text>
            <Pressable onPress={close} testID={`${testID}-close`}>
              <Text className="text-sm text-blue-600 dark:text-blue-400">{t("common.cancel")}</Text>
            </Pressable>
          </View>
          <TextInput
            className="mx-4 mb-3 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm"
            placeholder={t("workoutForm.searchExercisePlaceholder")}
            value={search}
            onChangeText={setSearch}
            autoFocus
            testID={`${testID}-search`}
          />
          <FlatList
            data={filteredDefs}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(String(item.id));
                  close();
                }}
                testID={`${testID}-option-${item.id}`}
                className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
              >
                <Text className="text-sm text-gray-900 dark:text-gray-100">{item.title}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                {t("workoutForm.noExercisesFound")}
              </Text>
            }
          />
        </View>
      </Modal>
    </>
  );
}
