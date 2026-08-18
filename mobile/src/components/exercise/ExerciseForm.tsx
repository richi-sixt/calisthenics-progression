import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useCategories } from "@/hooks/use-categories";
import type { ExerciseDefinition } from "@/types";

interface ExerciseFormData {
  title: string;
  description: string;
  counting_type: "reps" | "duration";
  progression_levels: { name: string }[];
  category_ids: number[];
}

export function ExerciseForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<ExerciseDefinition>;
  onSubmit: (data: ExerciseFormData) => void;
  isPending: boolean;
}) {
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  const { handleSubmit, control, watch, setValue } = useForm<ExerciseFormData>({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      counting_type: defaultValues?.counting_type ?? "reps",
      progression_levels: defaultValues?.progression_levels?.map((p) => ({ name: p.name })) ?? [],
      category_ids: defaultValues?.category_ids ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "progression_levels" });
  const selectedCats: number[] = watch("category_ids") ?? [];

  const toggleCategory = (catId: number) => {
    const next = selectedCats.includes(catId)
      ? selectedCats.filter((id) => id !== catId)
      : [...selectedCats, catId];
    setValue("category_ids", next, { shouldDirty: true });
  };

  return (
    <View className="gap-6">
      <View>
        <Text className="text-sm font-medium text-gray-700">Title</Text>
        <Controller
          control={control}
          name="title"
          rules={{ required: true }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Planche"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700">Description</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional description"
              multiline
              numberOfLines={3}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700">Counting type</Text>
        <Controller
          control={control}
          name="counting_type"
          render={({ field: { onChange, value } }) => (
            <View className="mt-1 flex-row gap-4">
              <Pressable className="flex-row items-center gap-2" onPress={() => onChange("reps")}>
                <View className={`h-4 w-4 rounded-full border ${value === "reps" ? "border-blue-600 bg-blue-600" : "border-gray-400"}`} />
                <Text className="text-sm">Reps</Text>
              </Pressable>
              <Pressable className="flex-row items-center gap-2" onPress={() => onChange("duration")}>
                <View className={`h-4 w-4 rounded-full border ${value === "duration" ? "border-blue-600 bg-blue-600" : "border-gray-400"}`} />
                <Text className="text-sm">Duration</Text>
              </Pressable>
            </View>
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700">Progression levels</Text>
        <View className="mt-2 gap-2">
          {fields.map((field, index) => (
            <View key={field.id} className="flex-row items-center gap-2">
              <Text className="w-6 text-xs text-gray-400">{index + 1}.</Text>
              <Controller
                control={control}
                name={`progression_levels.${index}.name`}
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="e.g. Tuck"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              <Pressable onPress={() => remove(index)}>
                <Text className="text-sm text-red-400">Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable onPress={() => append({ name: "" })} className="mt-2">
          <Text className="text-sm text-blue-600">+ Add level</Text>
        </Pressable>
      </View>

      {categories.length > 0 && (
        <View>
          <Text className="text-sm font-medium text-gray-700">Categories</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                className={`rounded-full px-3 py-1 ${selectedCats.includes(cat.id) ? "bg-blue-100" : "bg-gray-100"}`}
              >
                <Text className={`text-sm font-medium ${selectedCats.includes(cat.id) ? "text-blue-700" : "text-gray-600"}`}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={handleSubmit(onSubmit)} disabled={isPending} className="items-center rounded-md bg-blue-600 py-3">
        {isPending ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Save</Text>}
      </Pressable>
    </View>
  );
}
