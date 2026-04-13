"use client";

import { useForm } from "react-hook-form";
import { useTranslation } from "@/i18n";

interface SendMessageFormData {
  recipient: string;
  body: string;
}

export default function SendMessageForm({
  defaultRecipient,
  onSubmit,
  isPending,
}: {
  defaultRecipient?: string;
  onSubmit: (data: SendMessageFormData) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, reset } = useForm<SendMessageFormData>({
    defaultValues: {
      recipient: defaultRecipient ?? "",
      body: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => {
        onSubmit(data);
        reset({ recipient: data.recipient, body: "" });
      })}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("messages.to")}</label>
        <input
          {...register("recipient", { required: true })}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
          placeholder={t("messages.usernamePlaceholder")}
          readOnly={!!defaultRecipient}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("messages.message")}</label>
        <textarea
          {...register("body", { required: true })}
          rows={4}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
          placeholder={t("messages.messagePlaceholder")}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? t("common.sending") : t("messages.sendMessage")}
      </button>
    </form>
  );
}
