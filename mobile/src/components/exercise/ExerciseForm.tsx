import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import * as ImagePicker from "expo-image-picker";
import { useCategories } from "@/hooks/use-categories";
import { useUploadImage } from "@/hooks/use-uploads";
import { insertImageMarkdown, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/uploaded-images";
import { useTranslation } from "@/i18n";
import type { ExerciseDefinition, Visibility } from "@/types";

interface ExerciseFormData {
  title: string;
  description: string;
  counting_type: "reps" | "duration";
  visibility: Visibility;
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
  const { t } = useTranslation();
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  const { handleSubmit, control, setValue, getValues } = useForm<ExerciseFormData>({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      counting_type: defaultValues?.counting_type ?? "reps",
      visibility: defaultValues?.visibility ?? "followers",
      progression_levels: defaultValues?.progression_levels?.map((p) => ({ name: p.name })) ?? [],
      category_ids: defaultValues?.category_ids ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "progression_levels" });

  // Last known cursor/selection in the description, so an image is inserted
  // where the user was typing (a ref: it must not re-render on every keystroke).
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const uploadImage = useUploadImage();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleAddImage = async () => {
    setUploadError(null);
    // No permission prompt needed for the system photo picker (Expo SDK 57 docs).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8, // re-encodes to JPEG, so HEIC photos upload fine
      shouldDownloadFromNetwork: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_UPLOAD_BYTES) {
      setUploadError(t("exerciseForm.imageTooLarge"));
      return;
    }
    uploadImage.mutate(asset, {
      onSuccess: (res) => {
        const current = getValues("description");
        const { start, end } = selectionRef.current ?? { start: current.length, end: current.length };
        const { text, cursor } = insertImageMarkdown(current, start, end, t("exerciseForm.imageAlt"), res.data.url);
        setValue("description", text, { shouldDirty: true });
        selectionRef.current = { start: cursor, end: cursor };
      },
      onError: (err) =>
        setUploadError(`${t("exerciseForm.imageUploadFailed")}: ${err instanceof Error ? err.message : String(err)}`),
    });
  };
  const selectedCats: number[] = useWatch({ control, name: "category_ids" }) ?? [];

  const toggleCategory = (catId: number) => {
    const next = selectedCats.includes(catId)
      ? selectedCats.filter((id) => id !== catId)
      : [...selectedCats, catId];
    setValue("category_ids", next, { shouldDirty: true });
  };

  return (
    <View className="gap-6">
      <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exerciseForm.title")}</Text>
        <Controller
          control={control}
          name="title"
          rules={{ required: true }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
              placeholder={t("exerciseForm.titlePlaceholder")}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exerciseForm.description")}</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="mt-1 min-h-32 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
              placeholder={t("exerciseForm.descriptionPlaceholder")}
              multiline
              textAlignVertical="top"
              onBlur={onBlur}
              onChangeText={onChange}
              onSelectionChange={(e) => {
                selectionRef.current = e.nativeEvent.selection;
              }}
              value={value}
              testID="exercise-description-input"
            />
          )}
        />
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          <Pressable
            onPress={handleAddImage}
            disabled={uploadImage.isPending}
            testID="exercise-add-image"
            className={`flex-row items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 dark:bg-gray-700 ${uploadImage.isPending ? "opacity-50" : ""}`}
          >
            {uploadImage.isPending && <ActivityIndicator size="small" />}
            <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {uploadImage.isPending ? t("exerciseForm.uploadingImage") : t("exerciseForm.addImage")}
            </Text>
          </Pressable>
        </View>
        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("exerciseForm.markdownHint")}</Text>
        {uploadError ? (
          <Text className="mt-1 text-xs text-red-600 dark:text-red-400" testID="exercise-image-error">
            {uploadError}
          </Text>
        ) : null}
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exerciseForm.countingType")}</Text>
        <Controller
          control={control}
          name="counting_type"
          render={({ field: { onChange, value } }) => (
            <View className="mt-1 flex-row gap-4">
              <Pressable className="flex-row items-center gap-2" onPress={() => onChange("reps")}>
                <View className={`h-4 w-4 rounded-full border ${value === "reps" ? "border-blue-600 bg-blue-600" : "border-gray-400 dark:border-gray-500"}`} />
                <Text className="text-sm text-gray-900 dark:text-gray-100">{t("exerciseForm.reps")}</Text>
              </Pressable>
              <Pressable className="flex-row items-center gap-2" onPress={() => onChange("duration")}>
                <View className={`h-4 w-4 rounded-full border ${value === "duration" ? "border-blue-600 bg-blue-600" : "border-gray-400 dark:border-gray-500"}`} />
                <Text className="text-sm text-gray-900 dark:text-gray-100">{t("exerciseForm.duration")}</Text>
              </Pressable>
            </View>
          )}
        />
      </View>

      <View className="gap-1">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exerciseForm.visibility")}</Text>
        <Controller
          control={control}
          name="visibility"
          render={({ field: { onChange, value } }) => (
            <>
              <View className="mt-1 flex-row self-start overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
                {(["public", "followers", "private"] as const).map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => onChange(opt)}
                    testID={`visibility-option-${opt}`}
                    className={`px-3 py-1.5 ${value === opt ? "bg-blue-600" : "bg-transparent"}`}
                  >
                    <Text className={`text-xs font-medium ${value === opt ? "text-white" : "text-gray-600 dark:text-gray-400"}`}>
                      {opt === "public" ? t("exercises.public") : opt === "followers" ? t("exercises.followers") : t("exercises.private")}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {value === "public"
                  ? t("exerciseForm.visibilityPublicHint")
                  : value === "private"
                    ? t("exerciseForm.visibilityPrivateHint")
                    : t("exerciseForm.visibilityFollowersHint")}
              </Text>
            </>
          )}
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exerciseForm.progressionLevels")}</Text>
        <View className="mt-2 gap-2">
          {fields.map((field, index) => (
            <View key={field.id} className="flex-row items-center gap-2">
              <Text className="w-6 text-xs text-gray-400 dark:text-gray-500">{index + 1}.</Text>
              <Controller
                control={control}
                name={`progression_levels.${index}.name`}
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm"
                    placeholder={t("exerciseForm.levelPlaceholder")}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              <Pressable onPress={() => remove(index)}>
                <Text className="text-sm text-red-400 dark:text-red-400">{t("common.remove")}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable onPress={() => append({ name: "" })} className="mt-2">
          <Text className="text-sm text-blue-600 dark:text-blue-400">{t("exerciseForm.addLevel")}</Text>
        </Pressable>
      </View>

      {categories.length > 0 && (
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("exerciseForm.categories")}</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                className={`rounded-full px-3 py-1 ${selectedCats.includes(cat.id) ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}
              >
                <Text className={`text-sm font-medium ${selectedCats.includes(cat.id) ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={handleSubmit(onSubmit)} disabled={isPending} className="items-center rounded-md bg-blue-600 py-3">
        {isPending ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">{t("exerciseForm.save")}</Text>}
      </Pressable>
    </View>
  );
}
