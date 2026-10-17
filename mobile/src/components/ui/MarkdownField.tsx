import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useUploadImage } from "@/hooks/use-uploads";
import { insertImageMarkdown, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/uploaded-images";
import { useTranslation } from "@/i18n";

/**
 * Markdown text field with an "Add image" button that uploads a picture and
 * inserts its Markdown where the cursor was (same behaviour as exercise descriptions).
 */
export function MarkdownField({
  value,
  onChange,
  label,
  placeholder,
  testID,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  // Last known cursor/selection (a ref: it must not re-render on every keystroke).
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const uploadImage = useUploadImage();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleAddImage = async () => {
    setUploadError(null);
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
        const { start, end } = selectionRef.current ?? { start: value.length, end: value.length };
        const { text, cursor } = insertImageMarkdown(value, start, end, t("exerciseForm.imageAlt"), res.data.url);
        onChange(text);
        selectionRef.current = { start: cursor, end: cursor };
      },
      onError: (err) =>
        setUploadError(`${t("exerciseForm.imageUploadFailed")}: ${err instanceof Error ? err.message : String(err)}`),
    });
  };

  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      <TextInput
        className="mt-1 min-h-32 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
        placeholder={placeholder}
        multiline
        textAlignVertical="top"
        value={value}
        onChangeText={onChange}
        onSelectionChange={(e) => {
          selectionRef.current = e.nativeEvent.selection;
        }}
        testID={testID}
      />
      <View className="mt-1 flex-row flex-wrap items-center gap-2">
        <Pressable
          onPress={handleAddImage}
          disabled={uploadImage.isPending}
          testID={testID ? `${testID}-add-image` : undefined}
          className={`flex-row items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 dark:bg-gray-700 ${uploadImage.isPending ? "opacity-50" : ""}`}
        >
          {uploadImage.isPending && <ActivityIndicator size="small" />}
          <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {uploadImage.isPending ? t("exerciseForm.uploadingImage") : t("exerciseForm.addImage")}
          </Text>
        </Pressable>
      </View>
      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("exerciseForm.markdownHint")}</Text>
      {uploadError ? <Text className="mt-1 text-xs text-red-600 dark:text-red-400">{uploadError}</Text> : null}
    </View>
  );
}
