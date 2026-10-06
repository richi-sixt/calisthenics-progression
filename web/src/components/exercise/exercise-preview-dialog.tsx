"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useExercise } from "@/hooks/use-exercises";
import { Markdown } from "@/components/ui/markdown";
import { useTranslation } from "@/i18n";

export default function ExercisePreviewDialog({
  exerciseId,
  onClose,
}: {
  exerciseId: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useExercise(exerciseId);
  const exercise = data?.data;

  return (
    <Dialog open={exerciseId != null} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs duration-150 data-closed:opacity-0 dark:bg-black/60"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 duration-150 data-closed:scale-95 data-closed:opacity-0 dark:bg-gray-800 dark:ring-white/10"
        >
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {exercise?.title ?? t("exercises.preview")}
          </DialogTitle>
          {isLoading && (
            <div className="mt-3 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          )}
          {exercise && (
            <>
              <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                {exercise.counting_type}
              </span>
              {exercise.description && (
                <Markdown className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {exercise.description}
                </Markdown>
              )}
              {exercise.progressions.length > 0 && (
                <ol className="mt-4 space-y-1">
                  {exercise.progressions.map((step, index) => (
                    <li
                      key={step.id}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium dark:bg-gray-700">
                        {index + 1}
                      </span>
                      {step.title}
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t("common.close")}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
