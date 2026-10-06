"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useCategories } from "@/hooks/use-categories";
import { useUploadImage } from "@/hooks/use-uploads";
import { insertImageMarkdown, MAX_IMAGE_UPLOAD_BYTES, ownImageUrl } from "@/lib/uploaded-images";
import ProgressionEditor, { type ProgressionItem } from "@/components/exercise/progression-editor";
import { useTranslation } from "@/i18n";
import type { ExerciseDefinition, Visibility } from "@/types";

interface ExerciseFormData {
  title: string;
  description: string;
  counting_type: "reps" | "duration" | "km";
  visibility: Visibility;
  progressions: ProgressionItem[];
  category_ids: number[];
  thumbnail: string | null;
}

export default function ExerciseForm({
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

  const { register, handleSubmit, control, setValue, getValues } =
    useForm<ExerciseFormData>({
      defaultValues: {
        title: defaultValues?.title ?? "",
        description: defaultValues?.description ?? "",
        counting_type: defaultValues?.counting_type ?? "reps",
        visibility: defaultValues?.visibility ?? "followers",
        progressions: defaultValues?.progressions?.map((p) => ({ id: p.id, title: p.title })) ?? [],
        category_ids: defaultValues?.category_ids ?? [],
        thumbnail: defaultValues?.thumbnail ?? null,
      },
    });

  const progressions = useWatch({ control, name: "progressions" }) ?? [];
  const progressionExcludes = [
    ...(defaultValues?.id != null ? [defaultValues.id] : []),
    ...(defaultValues?.parents?.map((p) => p.id) ?? []),
  ];

  const selectedCats: number[] = useWatch({ control, name: "category_ids" }) ?? [];
  const visibility = useWatch({ control, name: "visibility" });
  const visibilityHint =
    visibility === "public"
      ? t("exerciseForm.visibilityPublicHint")
      : visibility === "private"
        ? t("exerciseForm.visibilityPrivateHint")
        : t("exerciseForm.visibilityFollowersHint");

  const { ref: descriptionRef, ...descriptionField } = register("description");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
        const current = getValues("description");
        const start = textarea?.selectionStart ?? current.length;
        const end = textarea?.selectionEnd ?? start;
        const { text, cursor } = insertImageMarkdown(current, start, end, t("exerciseForm.imageAlt"), res.data.url);
        setValue("description", text, { shouldDirty: true });
        requestAnimationFrame(() => {
          textarea?.focus();
          textarea?.setSelectionRange(cursor, cursor);
        });
      },
      onError: (err) =>
        setUploadError(`${t("exerciseForm.imageUploadFailed")}: ${err instanceof Error ? err.message : String(err)}`),
    });
  };

  const thumbnail = useWatch({ control, name: "thumbnail" });
  const thumbnailPreview = thumbnail ? ownImageUrl(`/static/exercise_images/${thumbnail}`) : null;
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const uploadThumbnail = useUploadImage();
  const [thumbError, setThumbError] = useState<string | null>(null);

  const handleThumbSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setThumbError(null);
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setThumbError(t("exerciseForm.imageTooLarge"));
      return;
    }
    uploadThumbnail.mutate(file, {
      onSuccess: (res) => setValue("thumbnail", res.data.filename, { shouldDirty: true }),
      onError: (err) =>
        setThumbError(`${t("exerciseForm.imageUploadFailed")}: ${err instanceof Error ? err.message : String(err)}`),
    });
  };

  const toggleCategory = (catId: number) => {
    const next = selectedCats.includes(catId)
      ? selectedCats.filter((id) => id !== catId)
      : [...selectedCats, catId];
    setValue("category_ids", next, { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("exerciseForm.title")}</label>
        <input
          {...register("title", { required: true })}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder={t("exerciseForm.titlePlaceholder")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("exerciseForm.description")}
        </label>
        <textarea
          {...descriptionField}
          ref={(el) => {
            descriptionRef(el);
            textareaRef.current = el;
          }}
          rows={6}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder={t("exerciseForm.descriptionPlaceholder")}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("exerciseForm.thumbnail")}
        </label>
        <div className="mt-1 flex items-center gap-3">
          {thumbnailPreview && (
            <img
              src={thumbnailPreview}
              alt={t("exerciseForm.thumbnailAlt")}
              className="h-16 w-16 rounded-md object-cover bg-gray-100 dark:bg-gray-700"
            />
          )}
          <button
            type="button"
            onClick={() => thumbInputRef.current?.click()}
            disabled={uploadThumbnail.isPending}
            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {uploadThumbnail.isPending ? t("exerciseForm.uploadingImage") : t("exerciseForm.setThumbnail")}
          </button>
          {thumbnail && (
            <button
              type="button"
              onClick={() => setValue("thumbnail", null, { shouldDirty: true })}
              className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400"
            >
              {t("exerciseForm.removeThumbnail")}
            </button>
          )}
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleThumbSelected}
            className="hidden"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("exerciseForm.thumbnailHint")}</p>
        {thumbError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{thumbError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("exerciseForm.countingType")}
        </label>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-2 text-sm dark:text-gray-300">
            <input type="radio" value="reps" {...register("counting_type")} />
            {t("exerciseForm.reps")}
          </label>
          <label className="flex items-center gap-2 text-sm dark:text-gray-300">
            <input
              type="radio"
              value="duration"
              {...register("counting_type")}
            />
            {t("exerciseForm.duration")}
          </label>
          <label className="flex items-center gap-2 text-sm dark:text-gray-300">
            <input type="radio" value="km" {...register("counting_type")} />
            {t("exerciseForm.km")}
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("exerciseForm.visibility")}
        </label>
        <select
          {...register("visibility")}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="public">{t("exercises.public")}</option>
          <option value="followers">{t("exercises.followers")}</option>
          <option value="private">{t("exercises.private")}</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{visibilityHint}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("exerciseForm.progressionLevels")}
        </label>
        <div className="mt-2">
          <ProgressionEditor
            value={progressions}
            onChange={(next) => setValue("progressions", next, { shouldDirty: true })}
            excludeIds={progressionExcludes}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("exerciseForm.categories")}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedCats.includes(cat.id)
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? t("common.saving") : t("exerciseForm.save")}
      </button>
    </form>
  );
}
