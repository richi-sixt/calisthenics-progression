"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useUploadImage } from "@/hooks/use-uploads";
import { insertImageMarkdown, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/uploaded-images";
import { useTranslation } from "@/i18n";

/**
 * Markdown textarea with an "Add image" button that uploads a picture and
 * inserts its Markdown at the cursor (same behaviour as exercise descriptions).
 */
export default function MarkdownField({
  value,
  onChange,
  label,
  placeholder,
  rows = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
}) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadImage();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setUploadError(t("exerciseForm.imageTooLarge"));
      return;
    }
    uploadImage.mutate(file, {
      onSuccess: (res) => {
        const textarea = textareaRef.current;
        const start = textarea?.selectionStart ?? value.length;
        const end = textarea?.selectionEnd ?? start;
        const { text, cursor } = insertImageMarkdown(
          value,
          start,
          end,
          t("exerciseForm.imageAlt"),
          res.data.url
        );
        onChange(text);
        requestAnimationFrame(() => {
          textarea?.focus();
          textarea?.setSelectionRange(cursor, cursor);
        });
      },
      onError: (err) =>
        setUploadError(
          `${t("exerciseForm.imageUploadFailed")}: ${err instanceof Error ? err.message : String(err)}`
        ),
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadImage.isPending}
          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          {uploadImage.isPending ? t("exerciseForm.uploadingImage") : t("exerciseForm.addImage")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelected}
          className="hidden"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("exerciseForm.markdownHint")}</p>
      </div>
      {uploadError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
    </div>
  );
}
